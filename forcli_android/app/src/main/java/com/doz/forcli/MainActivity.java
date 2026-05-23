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
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.webkit.WebChromeClient;
import android.webkit.GeolocationPermissions;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import android.util.Base64;
import android.os.Looper;

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
        WebView.enableSlowWholeDocumentDraw();
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

        // Request location permissions if not granted
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, 100);
        }

        // Configure WebView
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setGeolocationEnabled(true);

        // Add WebChromeClient to handle Geolocation permission
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                // Always grant permission inside WebView if Android permission is granted
                callback.invoke(origin, true, false);
            }
        });

        // Add Javascript Interface for printing
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidInterface");

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
                view.evaluateJavascript("window.print = function() { AndroidInterface.print(); };", null);
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

    private Bitmap cropWhitespace(Bitmap bitmap) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        
        int left = width, right = -1;
        int top = height, bottom = -1;

        int[] rowPixels = new int[width];
        for (int y = 0; y < height; y++) {
            bitmap.getPixels(rowPixels, 0, width, 0, y, width, 1);
            boolean rowHasContent = false;
            for (int x = 0; x < width; x++) {
                int color = rowPixels[x];
                int r = android.graphics.Color.red(color);
                int g = android.graphics.Color.green(color);
                int b = android.graphics.Color.blue(color);
                // Threshold for anti-aliasing (ignore pure white or near-white)
                if (r < 250 || g < 250 || b < 250) {
                    if (x < left) left = x;
                    if (x > right) right = x;
                    rowHasContent = true;
                }
            }
            if (rowHasContent) {
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }

        if (left > right || top > bottom) return bitmap; // Blank image

        int paddingX = 10;
        int paddingY = 10;
        left = Math.max(0, left - paddingX);
        right = Math.min(width - 1, right + paddingX);
        top = Math.max(0, top - paddingY);
        bottom = Math.min(height - 1, bottom + paddingY);

        return Bitmap.createBitmap(bitmap, left, top, right - left + 1, bottom - top + 1);
    }

    private void doPrint() {
        try {
            android.widget.Toast.makeText(this, "Préparation...", android.widget.Toast.LENGTH_SHORT).show();
            // Get content dimensions for exact continuous roll length
            int width = webView.getWidth();
            int contentHeight = (int) (webView.getContentHeight() * webView.getScale());

            if (width <= 0) width = 384; // standard 58mm width pixels
            if (contentHeight <= 0) contentHeight = webView.getHeight();

            // Create bitmap on UI thread (RGB_565 uses 50% less RAM)
            Bitmap bitmap = Bitmap.createBitmap(width, contentHeight, Bitmap.Config.RGB_565);
            Canvas canvas = new Canvas(bitmap);
            canvas.drawColor(android.graphics.Color.WHITE);
            webView.draw(canvas);

            // Offload compression and IO to background thread to prevent UI freeze
            new Thread(() -> {
                try {
                    // Auto-crop white margins so the ticket uses the full 58mm width
                    Bitmap croppedBitmap = cropWhitespace(bitmap);

                    File cachePath = new File(getCacheDir(), "images");
                    if (!cachePath.exists()) {
                        cachePath.mkdirs();
                    }
                    File file = new File(cachePath, "ticket.jpg");
                    FileOutputStream stream = new FileOutputStream(file);
                    // JPEG is safer and faster. Background is white, so no alpha needed.
                    croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 100, stream);
                    stream.close();

                    Uri contentUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", file);

                    if (contentUri != null) {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("image/jpeg");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                        // Print via Eleph Label
                        shareIntent.setPackage("com.sandu.JxPrinter");
                        
                        runOnUiThread(() -> {
                            try {
                                startActivity(shareIntent);
                            } catch (android.content.ActivityNotFoundException e) {
                                // Fallback to chooser if Eleph Label is not installed
                                shareIntent.setPackage(null);
                                startActivity(Intent.createChooser(shareIntent, "Imprimer via"));
                            }
                        });
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void print() {
            runOnUiThread(() -> doPrint());
        }

        /**
         * Called from JavaScript: AndroidInterface.printImageEleph(base64, fileName)
         * Decodes a base64 PNG, saves to cache, and opens Eleph Label (com.sandu.JxPrinter)
         * with the image URI via ACTION_SEND intent.
         */
        @JavascriptInterface
        public void printImageEleph(String base64Data, String fileName) {
            new Thread(() -> {
                try {
                    // Decode base64 PNG
                    byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);

                    // Save to cache dir (accessible via FileProvider)
                    File cachePath = new File(getCacheDir(), "images");
                    if (!cachePath.exists()) cachePath.mkdirs();

                    String safeFileName = (fileName != null && !fileName.isEmpty()) ? fileName : "ticket.png";
                    File file = new File(cachePath, safeFileName);
                    FileOutputStream fos = new FileOutputStream(file);
                    fos.write(imageBytes);
                    fos.close();

                    // Build FileProvider URI
                    Uri contentUri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider",
                        file
                    );

                    if (contentUri == null) return;

                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType("image/png");
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    // Target Eleph Label / JxPrinter directly
                    shareIntent.setPackage("com.sandu.JxPrinter");

                    runOnUiThread(() -> {
                        try {
                            startActivity(shareIntent);
                        } catch (android.content.ActivityNotFoundException e) {
                            // Eleph Label not installed: show system chooser
                            shareIntent.setPackage(null);
                            startActivity(Intent.createChooser(shareIntent, "Imprimer le ticket"));
                        }
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                    runOnUiThread(() ->
                        android.widget.Toast.makeText(
                            MainActivity.this,
                            "Erreur impression: " + e.getMessage(),
                            android.widget.Toast.LENGTH_LONG
                        ).show()
                    );
                }
            }).start();
        }
    }
}
