defmodule ThysisWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :thysis

  @static_path "priv/web-client"
  @static_matches ~w(
    index
    favicon
    manifest
    robots.txt
    static
    css
    js
    fonts
    images
    icon
    precache-manifest
    service-worker
  )

  @sw_req_path "/service-worker.js"
  @sw_file "priv/web-client/service-worker.js.gz"

  if Application.get_env(:thysis, :sql_sandbox) do
    plug(Phoenix.Ecto.SQL.Sandbox)
  end

  socket("/socket", ThysisWeb.UserSocket)

  # Serve the service worker file. We don't use Plug.Static because the
  # service worker response requires special headers e.g 'cache-control' must
  # be set to 'no-cache' but Plug.Static sets it to 'public'
  plug(:serve_sw)

  # Serve frontend at /index.html (root path). Static files will be served from
  # priv/web-client
  plug(ThysisWeb.FrontEnd)

  # You should set gzip to true if you are running phoenix.digest
  # when deploying your static files in production.
  plug(
    Plug.Static,
    at: "/",
    gzip: true,
    from: @static_path,
    only_matching: @static_matches
  )

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket("/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket)
    plug(Phoenix.LiveReloader)
    plug(Phoenix.CodeReloader)
  end

  plug(Plug.RequestId)
  plug(Plug.Logger)

  plug(
    Plug.Parsers,
    parsers: [
      :urlencoded,
      :multipart,
      :json,
      Absinthe.Plug.Parser
    ],
    pass: ["*/*"],
    json_decoder: Poison
  )

  plug(Plug.MethodOverride)
  plug(Plug.Head)

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  plug(
    Plug.Session,
    store: :cookie,
    key: "_thysis_key",
    signing_salt: "eyu4EJuz"
  )

  plug(
    Corsica,
    origins: "*",
    allow_headers: ~w(Accept Content-Type Authorization Origin)
  )

  plug(ThysisWeb.Router)

  @doc """
  Callback invoked for dynamically configuring the endpoint.

  It receives the endpoint configuration and checks if
  configuration should be loaded from the system environment.
  """
  def init(_key, config) do
    if config[:load_from_system_env] do
      port = System.get_env("PORT") || raise "expected the PORT environment variable to be set"
      {:ok, Keyword.put(config, :http, [:inet6, port: port])}
    else
      {:ok, config}
    end
  end

  def serve_sw(%{request_path: @sw_req_path} = conn, _opts) do
    conn =
      update_in(
        conn.resp_headers,
        &[
          {"content-encoding", "gzip"},
          {"vary", "Accept-Encoding"},
          {"accept-ranges", "bytes"},
          {"content-type", "application/javascript"},
          {"server", "Cowboy"}
          | &1
        ]
      )

    conn
    |> send_file(200, @sw_file)
    |> halt()
  end

  def serve_sw(conn, _), do: conn
end
