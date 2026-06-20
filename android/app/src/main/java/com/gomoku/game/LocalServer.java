package com.gomoku.game;

import android.content.res.AssetManager;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class LocalServer extends Thread {
    private final AssetManager assetManager;
    private final ServerSocket serverSocket;
    private volatile boolean running = true;

    public LocalServer(int port, AssetManager assetManager) throws IOException {
        this.assetManager = assetManager;
        this.serverSocket = new ServerSocket(port);
        setName("GomokuLocalServer");
    }

    @Override
    public void run() {
        while (running) {
            try {
                Socket socket = serverSocket.accept();
                handle(socket);
            } catch (IOException error) {
                if (running) {
                    error.printStackTrace();
                }
            }
        }
    }

    public void shutdown() {
        running = false;
        try {
            serverSocket.close();
        } catch (IOException ignored) {
        }
    }

    private void handle(Socket socket) throws IOException {
        try (Socket closeableSocket = socket) {
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(closeableSocket.getInputStream(), StandardCharsets.UTF_8)
            );
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) {
                return;
            }

            String[] parts = requestLine.split(" ");
            String path = parts.length > 1 ? parts[1] : "/index.html";
            if ("/".equals(path)) {
                path = "/index.html";
            }
            int queryIndex = path.indexOf('?');
            if (queryIndex >= 0) {
                path = path.substring(0, queryIndex);
            }

            byte[] body;
            String contentType;
            int status;

            try {
                body = readAsset("public" + path);
                contentType = mimeType(path);
                status = 200;
            } catch (IOException error) {
                body = "Not Found".getBytes(StandardCharsets.UTF_8);
                contentType = "text/plain; charset=UTF-8";
                status = 404;
            }

            OutputStream output = closeableSocket.getOutputStream();
            String headers =
                "HTTP/1.1 " + status + (status == 200 ? " OK" : " Not Found") + "\r\n" +
                "Content-Type: " + contentType + "\r\n" +
                "Content-Length: " + body.length + "\r\n" +
                "Cache-Control: no-store\r\n" +
                "Connection: close\r\n\r\n";
            output.write(headers.getBytes(StandardCharsets.UTF_8));
            output.write(body);
            output.flush();
        }
    }

    private byte[] readAsset(String path) throws IOException {
        try (InputStream input = assetManager.open(path);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            return output.toByteArray();
        }
    }

    private String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html; charset=UTF-8";
        if (path.endsWith(".js")) return "text/javascript; charset=UTF-8";
        if (path.endsWith(".css")) return "text/css; charset=UTF-8";
        if (path.endsWith(".json")) return "application/json; charset=UTF-8";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".gif")) return "image/gif";
        if (path.endsWith(".jpeg") || path.endsWith(".jpg")) return "image/jpeg";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }
}
