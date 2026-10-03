package com.nexa.ai

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.camera2.CameraManager
import android.media.projection.MediaProjectionManager
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.*
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.nexa.ai.service.ScreenCaptureService
import com.nexa.ai.ui.theme.NexaBackground

class MainActivity : ComponentActivity() {

    private var isScreenSharing by mutableStateOf(false)

    private val screenCaptureLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                action = ScreenCaptureService.ACTION_START
                putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(ScreenCaptureService.EXTRA_DATA, result.data)
            }
            startForegroundService(serviceIntent)
            isScreenSharing = true
            Toast.makeText(this, "🛡️ Gemini Live Screen Sharing Active", Toast.LENGTH_SHORT).show()
        } else {
            isScreenSharing = false
            Toast.makeText(this, "Screen capture permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    fun requestScreenShare() {
        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        screenCaptureLauncher.launch(projectionManager.createScreenCaptureIntent())
    }

    fun stopScreenShare() {
        val stopIntent = Intent(this, ScreenCaptureService::class.java).apply {
            action = ScreenCaptureService.ACTION_STOP
        }
        startService(stopIntent)
        isScreenSharing = false
        Toast.makeText(this, "Screen share stopped", Toast.LENGTH_SHORT).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = NexaBackground
            ) {
                AndroidView(
                    factory = { context ->
                        WebView(context).apply {
                            layoutParams = android.view.ViewGroup.LayoutParams(
                                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                                android.view.ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            // Enable third-party cookies for Google & Firebase Auth inside WebView
                            val cookieManager = CookieManager.getInstance()
                            cookieManager.setAcceptCookie(true)
                            cookieManager.setAcceptThirdPartyCookies(this, true)

                            settings.apply {
                                javaScriptEnabled = true
                                javaScriptCanOpenWindowsAutomatically = true
                                setSupportMultipleWindows(true)
                                domStorageEnabled = true
                                databaseEnabled = true
                                mediaPlaybackRequiresUserGesture = false
                                allowFileAccess = true
                                allowContentAccess = true
                                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                useWideViewPort = true
                                loadWithOverviewMode = true
                                userAgentString = "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 NexaApp/1.0"
                            }

                            webChromeClient = object : WebChromeClient() {
                                override fun onPermissionRequest(request: PermissionRequest) {
                                    runOnUiThread {
                                        request.grant(request.resources)
                                    }
                                }

                                override fun onCreateWindow(
                                    view: WebView?,
                                    isDialog: Boolean,
                                    isUserGesture: Boolean,
                                    resultMsg: android.os.Message?
                                ): Boolean {
                                    // Handle Google Sign-in / OAuth popup in the same WebView
                                    val href = view?.handler?.obtainMessage()
                                    view?.requestFocusNodeHref(href)
                                    val url = href?.data?.getString("url")
                                    if (!url.isNullOrEmpty()) {
                                        view.loadUrl(url)
                                        return true
                                    }
                                    val transport = resultMsg?.obj as? WebView.WebViewTransport
                                    transport?.webView = view
                                    resultMsg?.sendToTarget()
                                    return true
                                }
                            }

                            webViewClient = object : WebViewClient() {
                                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                                    return false
                                }
                            }

                            addJavascriptInterface(object {
                                @JavascriptInterface
                                fun startScreenShare() {
                                    runOnUiThread {
                                        requestScreenShare()
                                    }
                                }

                                @JavascriptInterface
                                fun stopScreenShare() {
                                    runOnUiThread {
                                        stopScreenShare()
                                    }
                                }

                                @JavascriptInterface
                                fun triggerHaptic(durationMs: Long) {
                                    try {
                                        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                                            vibratorManager.defaultVibrator
                                        } else {
                                            @Suppress("DEPRECATION")
                                            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                                        }
                                        if (vibrator.hasVibrator()) {
                                            vibrator.vibrate(VibrationEffect.createOneShot(durationMs.coerceIn(10, 500), VibrationEffect.DEFAULT_AMPLITUDE))
                                        }
                                    } catch (e: Exception) {
                                        e.printStackTrace()
                                    }
                                }

                                @JavascriptInterface
                                fun getBatteryLevel(): Int {
                                    return try {
                                        val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
                                        val batteryStatus = registerReceiver(null, ifilter)
                                        val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
                                        val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
                                        if (level >= 0 && scale > 0) ((level / scale.toFloat()) * 100).toInt() else -1
                                    } catch (e: Exception) {
                                        -1
                                    }
                                }

                                @JavascriptInterface
                                fun toggleFlashlight(turnOn: Boolean): Boolean {
                                    return try {
                                        val cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
                                        val cameraId = cameraManager.cameraIdList[0]
                                        cameraManager.setTorchMode(cameraId, turnOn)
                                        true
                                    } catch (e: Exception) {
                                        false
                                    }
                                }

                                @JavascriptInterface
                                fun showNativeToast(message: String) {
                                    runOnUiThread {
                                        Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }, "AndroidNexa")

                            loadUrl("https://ais-pre-2gsnu3yca3fsou57ycudjf-410799949515.asia-southeast1.run.app")
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}
