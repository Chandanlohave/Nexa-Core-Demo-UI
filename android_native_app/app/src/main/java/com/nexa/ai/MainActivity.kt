package com.nexa.ai

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
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
                            settings.apply {
                                javaScriptEnabled = true
                                domStorageEnabled = true
                                databaseEnabled = true
                                mediaPlaybackRequiresUserGesture = false
                                allowFileAccess = true
                                allowContentAccess = true
                                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                useWideViewPort = true
                                loadWithOverviewMode = true
                            }

                            webChromeClient = object : WebChromeClient() {
                                override fun onPermissionRequest(request: PermissionRequest) {
                                    runOnUiThread {
                                        request.grant(request.resources)
                                    }
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
                            }, "AndroidScreenShare")

                            loadUrl("https://ais-dev-2gsnu3yca3fsou57ycudjf-410799949515.asia-southeast1.run.app")
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}
