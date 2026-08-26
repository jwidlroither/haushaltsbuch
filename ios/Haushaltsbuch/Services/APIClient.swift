import Foundation

/// Schlanker Wrapper um URLSession für alle Backend-Aufrufe.
/// Baut Requests aus gespeicherter Basis-URL + Bearer-Token, dekodiert JSON
/// (snake_case → camelCase, siehe Kommentar in Transaction.swift) und wirft
/// überall typisierte `APIError`s statt abzustürzen.
actor APIClient {
    static let shared = APIClient()

    private let session: URLSession

    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }()

    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }()

    init(session: URLSession = .shared) {
        self.session = session
    }

    // MARK: - Auth / Profil

    func fetchMe(baseURL: String? = nil, tokenOverride: String? = nil) async throws -> User {
        let envelope: UserEnvelope = try await request(
            "/auth/me", method: "GET", tokenOverride: tokenOverride, baseURLOverride: baseURL
        )
        return envelope.user
    }

    /// Validiert Server-URL + Token beim Onboarding, bevor irgendetwas persistiert wird.
    func verify(baseURL: String, token: String) async throws -> User {
        try await fetchMe(baseURL: baseURL, tokenOverride: token)
    }

    func updateMe(payday: Int?) async throws -> User {
        struct Body: Encodable { let payday: Int? }
        let envelope: UserEnvelope = try await request(
            "/auth/me", method: "PATCH", body: Body(payday: payday)
        )
        return envelope.user
    }

    // MARK: - Transaktionen

    func fetchTransactions(
        month: Int, year: Int,
        categoryId: String? = nil,
        type: TransactionType? = nil,
        status: TransactionStatus? = nil,
        limit: Int? = nil,
        offset: Int? = nil
    ) async throws -> (items: [Transaction], total: Int) {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "month", value: String(month)),
            URLQueryItem(name: "year", value: String(year)),
        ]
        if let categoryId { items.append(URLQueryItem(name: "category_id", value: categoryId)) }
        if let type { items.append(URLQueryItem(name: "type", value: type.rawValue)) }
        if let status { items.append(URLQueryItem(name: "status", value: status.rawValue)) }
        if let limit { items.append(URLQueryItem(name: "limit", value: String(limit))) }
        if let offset { items.append(URLQueryItem(name: "offset", value: String(offset))) }

        let envelope: APIEnvelope<[Transaction]> = try await request(
            "/transactions", method: "GET", queryItems: items
        )
        return (envelope.data, envelope.total ?? envelope.data.count)
    }

    func createTransaction(_ dto: CreateTransactionDto) async throws -> Transaction {
        let envelope: APIEnvelope<Transaction> = try await request(
            "/transactions", method: "POST", body: dto
        )
        return envelope.data
    }

    func updateTransaction(id: String, dto: CreateTransactionDto) async throws -> Transaction {
        let envelope: APIEnvelope<Transaction> = try await request(
            "/transactions/\(id)", method: "PUT", body: dto
        )
        return envelope.data
    }

    func deleteTransaction(id: String) async throws {
        try await requestNoContent("/transactions/\(id)", method: "DELETE")
    }

    func markPaid(id: String) async throws -> Transaction {
        struct EmptyBody: Encodable {}
        let envelope: APIEnvelope<Transaction> = try await request(
            "/transactions/\(id)/pay", method: "PATCH", body: EmptyBody()
        )
        return envelope.data
    }

    // MARK: - Kategorien

    func fetchCategories() async throws -> [Category] {
        let envelope: APIEnvelope<[Category]> = try await request("/categories", method: "GET")
        return envelope.data
    }

    // MARK: - Budget

    func fetchBudgetOverview(month: Int, year: Int) async throws -> BudgetOverview {
        let items = [
            URLQueryItem(name: "month", value: String(month)),
            URLQueryItem(name: "year", value: String(year)),
        ]
        // Anders als die übrigen Endpunkte liefert /budgets/overview das Objekt direkt,
        // ohne { data: ... }-Hülle.
        return try await request("/budgets/overview", method: "GET", queryItems: items)
    }

    // MARK: - Request-Kern

    private func buildRequest(
        path: String,
        method: String,
        queryItems: [URLQueryItem],
        tokenOverride: String?,
        baseURLOverride: String?
    ) throws -> URLRequest {
        let rawBaseURLString: String
        if let baseURLOverride {
            rawBaseURLString = baseURLOverride
        } else if let stored = SettingsStore.serverURL {
            rawBaseURLString = stored
        } else {
            throw APIError.invalidBaseURL
        }
        // Trailing Slash entfernen, damit "https://host/api/" + "/transactions" nicht zu
        // einem doppelten Slash im Pfad führt.
        var baseURLString = rawBaseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        while baseURLString.hasSuffix("/") {
            baseURLString.removeLast()
        }

        guard var components = URLComponents(string: baseURLString),
              let scheme = components.scheme, scheme.hasPrefix("http"),
              let host = components.host, !host.isEmpty
        else {
            throw APIError.invalidBaseURL
        }
        components.path += path
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw APIError.invalidBaseURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let token: String?
        if let tokenOverride {
            token = tokenOverride
        } else {
            token = try? KeychainStore.loadToken()
        }
        guard let token, !token.isEmpty else {
            throw APIError.notAuthenticated
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return request
    }

    /// Führt den Request aus, prüft den Statuscode und liefert die rohen Response-Daten.
    /// Bei 401 wird zusätzlich der gespeicherte Token gelöscht, damit die App beim
    /// nächsten Start wieder den Onboarding-Screen zeigt.
    private func perform(_ request: URLRequest) async throws -> Data {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.network(error.localizedDescription)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.network("Keine gültige HTTP-Antwort.")
        }

        switch httpResponse.statusCode {
        case 200...299:
            return data
        case 401:
            try? KeychainStore.deleteToken()
            throw APIError.unauthorized
        default:
            let message = (try? decoder.decode(ServerErrorBody.self, from: data))?.resolvedMessage
            throw APIError.server(status: httpResponse.statusCode, message: message)
        }
    }

    private func request<Response: Decodable>(
        _ path: String,
        method: String,
        queryItems: [URLQueryItem] = [],
        tokenOverride: String? = nil,
        baseURLOverride: String? = nil
    ) async throws -> Response {
        let urlRequest = try buildRequest(
            path: path, method: method, queryItems: queryItems,
            tokenOverride: tokenOverride, baseURLOverride: baseURLOverride
        )
        let data = try await perform(urlRequest)
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    private func request<Body: Encodable, Response: Decodable>(
        _ path: String,
        method: String,
        body: Body,
        queryItems: [URLQueryItem] = [],
        tokenOverride: String? = nil,
        baseURLOverride: String? = nil
    ) async throws -> Response {
        var urlRequest = try buildRequest(
            path: path, method: method, queryItems: queryItems,
            tokenOverride: tokenOverride, baseURLOverride: baseURLOverride
        )
        do {
            urlRequest.httpBody = try encoder.encode(body)
        } catch {
            throw APIError.decoding
        }
        let data = try await perform(urlRequest)
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    private func requestNoContent(
        _ path: String,
        method: String,
        queryItems: [URLQueryItem] = []
    ) async throws {
        let urlRequest = try buildRequest(
            path: path, method: method, queryItems: queryItems,
            tokenOverride: nil, baseURLOverride: nil
        )
        _ = try await perform(urlRequest)
    }
}

/// Best-effort-Dekodierung einer möglichen Fehlermeldung des Backends, z.B. `{ "error": "..." }`
/// oder `{ "message": "..." }`. Schlägt die Dekodierung fehl, bleibt `message` einfach `nil`.
private struct ServerErrorBody: Decodable {
    let message: String?
    let error: String?

    var resolvedMessage: String? { message ?? error }

    private enum CodingKeys: String, CodingKey { case message, error }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        message = try container.decodeIfPresent(String.self, forKey: .message)
        error = try container.decodeIfPresent(String.self, forKey: .error)
    }
}
