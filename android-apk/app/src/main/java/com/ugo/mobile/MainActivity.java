package com.ugo.mobile;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.ContentValues;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.FrameLayout;

import org.json.JSONObject;

import java.util.ArrayList;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 701;
    private static final int LOCATION_REQUEST = 702;
    private static final int MICROPHONE_REQUEST = 703;
    private static final int CAMERA_REQUEST = 704;
    private static final int FILE_CHOOSER_CAMERA_PERMISSION_REQUEST = 705;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private WebChromeClient.FileChooserParams pendingFileChooserParams;
    private Uri pendingCameraUri;
    private PermissionRequest pendingWebPermissionRequest;
    private GeolocationPermissions.Callback pendingGeolocationCallback;
    private String pendingGeolocationOrigin;
    private SpeechRecognizer speechRecognizer;
    private boolean pendingNativeVoiceStart = false;
    private boolean nativeVoiceActive = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(5, 9, 13));

        webView = new WebView(this);
        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        );
        root.addView(webView, webParams);

        ProgressBar progress = new ProgressBar(this);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(56, 56);
        progressParams.gravity = android.view.Gravity.CENTER;
        root.addView(progress, progressParams);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setUserAgentString(settings.getUserAgentString() + " UGO-Android/1.3");

        webView.setVerticalScrollBarEnabled(true);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        webView.setNestedScrollingEnabled(true);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.addJavascriptInterface(new NativeVoiceBridge(), "UGOVoiceBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                view.evaluateJavascript(
                    "(function(){" +
                    "var m=document.querySelector('meta[name=viewport]');" +
                    "if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);}" +
                    "m.content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';" +
                    "document.documentElement.style.width='100%';" +
                    "document.documentElement.style.height='auto';" +
                    "document.documentElement.style.overflowY='auto';" +
                    "document.body.style.width='100%';" +
                    "document.body.style.height='auto';" +
                    "document.body.style.overflowY='auto';" +
                    "})();",
                    null
                );
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                        checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                    return;
                }
                pendingGeolocationOrigin = origin;
                pendingGeolocationCallback = callback;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_REQUEST);
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean wantsAudio = false;
                    boolean wantsVideo = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) wantsAudio = true;
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) wantsVideo = true;
                    }
                    if (!wantsAudio && !wantsVideo) {
                        request.deny();
                        return;
                    }

                    boolean audioGranted = !wantsAudio || checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                    boolean videoGranted = !wantsVideo || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                    if (audioGranted && videoGranted) {
                        ArrayList<String> resources = new ArrayList<>();
                        if (wantsAudio) resources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                        if (wantsVideo) resources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                        request.grant(resources.toArray(new String[0]));
                        return;
                    }

                    pendingWebPermissionRequest = request;
                    ArrayList<String> permissions = new ArrayList<>();
                    if (wantsAudio && !audioGranted) permissions.add(Manifest.permission.RECORD_AUDIO);
                    if (wantsVideo && !videoGranted) permissions.add(Manifest.permission.CAMERA);
                    requestPermissions(permissions.toArray(new String[0]), wantsVideo ? CAMERA_REQUEST : MICROPHONE_REQUEST);
                });
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingWebPermissionRequest == request) pendingWebPermissionRequest = null;
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = filePathCallback;
                pendingFileChooserParams = fileChooserParams;

                if (acceptsImage(fileChooserParams) &&
                        checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, FILE_CHOOSER_CAMERA_PERMISSION_REQUEST);
                    return true;
                }

                launchFileChooser(fileChooserParams, acceptsImage(fileChooserParams));
                return true;
            }
        });

        if (savedInstanceState == null) webView.loadUrl(BuildConfig.UGO_URL);
        else webView.restoreState(savedInstanceState);
    }

    private boolean acceptsImage(WebChromeClient.FileChooserParams params) {
        String[] acceptTypes = params != null ? params.getAcceptTypes() : null;
        if (acceptTypes == null || acceptTypes.length == 0) return false;
        for (String type : acceptTypes) {
            if (type != null && (type.startsWith("image/") || type.equals("image/*"))) return true;
        }
        return false;
    }

    private Intent buildFilePickerIntent(WebChromeClient.FileChooserParams params) {
        try {
            return params.createIntent();
        } catch (Exception e) {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            return intent;
        }
    }

    private Intent buildCameraIntent() {
        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (cameraIntent.resolveActivity(getPackageManager()) == null) return null;

        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, "ugo-evidencia-" + System.currentTimeMillis() + ".jpg");
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        pendingCameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (pendingCameraUri == null) return null;

        cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
        cameraIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return cameraIntent;
    }

    private void launchFileChooser(WebChromeClient.FileChooserParams params, boolean includeCamera) {
        Intent pickerIntent = buildFilePickerIntent(params);
        if (!includeCamera) {
            startActivityForResult(pickerIntent, FILE_CHOOSER_REQUEST);
            return;
        }

        Intent cameraIntent = buildCameraIntent();
        if (cameraIntent == null) {
            startActivityForResult(pickerIntent, FILE_CHOOSER_REQUEST);
            return;
        }

        Intent chooser = new Intent(Intent.ACTION_CHOOSER);
        chooser.putExtra(Intent.EXTRA_INTENT, pickerIntent);
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent});
        startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
    }

    private void clearUnusedCameraUri() {
        if (pendingCameraUri == null) return;
        try { getContentResolver().delete(pendingCameraUri, null, null); } catch (Exception ignored) {}
        pendingCameraUri = null;
    }

    private void resolvePendingWebPermissionRequest() {
        if (pendingWebPermissionRequest == null) return;
        ArrayList<String> grantedResources = new ArrayList<>();
        for (String resource : pendingWebPermissionRequest.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) &&
                    checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                grantedResources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
            }
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) &&
                    checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                grantedResources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
            }
        }
        if (grantedResources.isEmpty()) pendingWebPermissionRequest.deny();
        else pendingWebPermissionRequest.grant(grantedResources.toArray(new String[0]));
        pendingWebPermissionRequest = null;
    }

    private void emitVoiceEvent(String name, String detailJson) {
        if (webView == null) return;
        final String script = "window.dispatchEvent(new CustomEvent('" + name + "',{detail:" + detailJson + "}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void startNativeRecognition() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            emitVoiceEvent("ugo:native-voice-error", "{\"code\":\"unavailable\"}");
            return;
        }
        stopNativeRecognition();
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { emitVoiceEvent("ugo:native-voice-state", "{\"state\":\"ready\"}"); }
            @Override public void onBeginningOfSpeech() { emitVoiceEvent("ugo:native-voice-state", "{\"state\":\"hearing\"}"); }
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onError(int error) {
                if (nativeVoiceActive && (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)) {
                    emitVoiceEvent("ugo:native-voice-state", "{\"state\":\"ready\"}");
                    scheduleNativeRecognitionRestart();
                    return;
                }
                nativeVoiceActive = false;
                String code = "native-" + error;
                emitVoiceEvent("ugo:native-voice-error", "{\"code\":" + JSONObject.quote(code) + "}");
            }
            @Override public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String text = matches != null && !matches.isEmpty() ? matches.get(0) : "";
                emitVoiceEvent("ugo:native-voice-result", "{\"text\":" + JSONObject.quote(text) + ",\"final\":true}");
                if (nativeVoiceActive) scheduleNativeRecognitionRestart();
            }
            @Override public void onPartialResults(Bundle partialResults) {
                ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String text = matches != null && !matches.isEmpty() ? matches.get(0) : "";
                if (!text.isEmpty()) emitVoiceEvent("ugo:native-voice-result", "{\"text\":" + JSONObject.quote(text) + ",\"final\":false}");
            }
            @Override public void onEvent(int eventType, Bundle params) {}
        });

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-AR");
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        speechRecognizer.startListening(intent);
    }

    private void scheduleNativeRecognitionRestart() {
        if (!nativeVoiceActive || webView == null) return;
        webView.postDelayed(() -> {
            if (nativeVoiceActive && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                startNativeRecognition();
            }
        }, 250);
    }

    private void stopNativeRecognition() {
        if (speechRecognizer != null) {
            try { speechRecognizer.cancel(); } catch (Exception ignored) {}
            try { speechRecognizer.destroy(); } catch (Exception ignored) {}
            speechRecognizer = null;
        }
    }

    public class NativeVoiceBridge {
        @JavascriptInterface
        public void startListening() {
            runOnUiThread(() -> {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    nativeVoiceActive = true;
                    startNativeRecognition();
                } else {
                    pendingNativeVoiceStart = true;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_REQUEST);
                }
            });
        }

        @JavascriptInterface
        public void stopListening() {
            runOnUiThread(() -> {
                pendingNativeVoiceStart = false;
                nativeVoiceActive = false;
                stopNativeRecognition();
            });
        }

        @JavascriptInterface
        public boolean isAvailable() {
            return SpeechRecognizer.isRecognitionAvailable(MainActivity.this);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_REQUEST) {
            boolean granted = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                    checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            if (pendingGeolocationCallback != null && pendingGeolocationOrigin != null) {
                pendingGeolocationCallback.invoke(pendingGeolocationOrigin, granted, false);
            }
            pendingGeolocationCallback = null;
            pendingGeolocationOrigin = null;
            return;
        }
        if (requestCode == CAMERA_REQUEST) {
            resolvePendingWebPermissionRequest();
            return;
        }
        if (requestCode == FILE_CHOOSER_CAMERA_PERMISSION_REQUEST) {
            boolean granted = checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
            WebChromeClient.FileChooserParams params = pendingFileChooserParams;
            pendingFileChooserParams = null;
            if (fileCallback != null && params != null) launchFileChooser(params, granted && acceptsImage(params));
            return;
        }
        if (requestCode == MICROPHONE_REQUEST) {
            boolean granted = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            if (pendingWebPermissionRequest != null) resolvePendingWebPermissionRequest();
            if (pendingNativeVoiceStart) {
                pendingNativeVoiceStart = false;
                if (granted) {
                    nativeVoiceActive = true;
                    startNativeRecognition();
                } else {
                    nativeVoiceActive = false;
                    emitVoiceEvent("ugo:native-voice-error", "{\"code\":\"not-allowed\"}");
                }
            }
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        nativeVoiceActive = false;
        stopNativeRecognition();
        if (pendingWebPermissionRequest != null) {
            pendingWebPermissionRequest.deny();
            pendingWebPermissionRequest = null;
        }
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        clearUnusedCameraUri();
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK) {
                result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                if ((result == null || result.length == 0) && pendingCameraUri != null) {
                    result = new Uri[]{pendingCameraUri};
                    pendingCameraUri = null;
                } else {
                    clearUnusedCameraUri();
                }
            } else {
                clearUnusedCameraUri();
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
            pendingFileChooserParams = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
