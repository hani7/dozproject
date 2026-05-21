package com.doz.forcli;

import android.annotation.SuppressLint;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebView;
import android.content.Intent;
import android.net.Uri;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout offlineLayout;
    private LinearLayout splashLayout;
    private SwipeRefreshLayout swipeRefreshLayout;
    private static final String APP_URL = "https://doz.baitul.tech/login";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Views
        splashLayout = findViewById(R.id.splash_layout);
        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progress_bar);
        offlineLayout = findViewById(R.id.offline_layout);
        swipeRefreshLayout = findViewById(R.id.swipe_refresh);

        // Splash logo animation
        ImageView splashLogo = findViewById(R.id.splash_logo);
        TextView splashTitle = findViewById(R.id.splash_title);
        Animation fadeIn = AnimationUtils.loadAnimation(this, R.anim.fade_in);
        Animation slideUp = AnimationUtils.loadAnimation(this, R.anim.slide_up);
        splashLogo.startAnimation(fadeIn);
        splashTitle.startAnimation(slideUp);

        // Hide splash after 2 seconds
        new Handler().postDelayed(() -> {
            Animation fadeOut = AnimationUtils.loadAnimation(this, R.anim.fade_out);
            splashLayout.startAnimation(fadeOut);
            splashLayout.setVisibility(View.GONE);
        }, 2000);

        // Configure WebView
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // SwipeRefresh colors
        swipeRefreshLayout.setColorSchemeColors(
                getResources().getColor(R.color.primary, null),
                getResources().getColor(R.color.secondary, null)
        );
        swipeRefreshLayout.setOnRefreshListener(() -> {
            webView.reload();
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("tel:")) {
                    Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } else if (url.startsWith("mailto:") || url.startsWith("geo:") || url.contains("maps.google.com") || url.contains("google.com/maps")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                return false; // Let WebView handle normal http/https links
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
                offlineLayout.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                swipeRefreshLayout.setRefreshing(false);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    progressBar.setVisibility(View.GONE);
                    swipeRefreshLayout.setRefreshing(false);
                    webView.setVisibility(View.GONE);
                    offlineLayout.setVisibility(View.VISIBLE);
                }
            }
        });

        // Retry button
        Button retryBtn = findViewById(R.id.retry_button);
        retryBtn.setOnClickListener(v -> {
            if (isConnected()) {
                offlineLayout.setVisibility(View.GONE);
                webView.reload();
            }
        });



        // Load URL
        if (isConnected()) {
            webView.loadUrl(APP_URL);
        } else {
            new Handler().postDelayed(() -> {
                splashLayout.setVisibility(View.GONE);
                offlineLayout.setVisibility(View.VISIBLE);
            }, 2100);
        }
    }

    private boolean isConnected() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo info = cm.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
