package com.gomoku.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;

public class MainActivity extends Activity {
    private static final int LOCAL_PORT = 8080;

    private WebView webView;
    private LocalServer localServer;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(true);
        }
        getWindow().setStatusBarColor(Color.parseColor("#1A1A2E"));
        getWindow().setNavigationBarColor(Color.parseColor("#1A1A2E"));

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.addJavascriptInterface(new AndroidBridge(this), "Android");
        webView.setWebViewClient(new WebViewClient());

        startLocalServer();
        webView.loadUrl("http://127.0.0.1:" + LOCAL_PORT + "/index.html");
    }

    private void startLocalServer() {
        try {
            localServer = new LocalServer(LOCAL_PORT, getAssets());
            localServer.start();
        } catch (IOException error) {
            throw new RuntimeException("Failed to start local asset server", error);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        if (localServer != null) {
            localServer.shutdown();
            localServer = null;
        }
        super.onDestroy();
    }
}

class AndroidBridge {
    private final Activity activity;

    AndroidBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void exitApp() {
        activity.runOnUiThread(activity::finish);
    }

    @JavascriptInterface
    public String getServerUrl() {
        return "ws://10.0.2.2:4000";
    }
}
