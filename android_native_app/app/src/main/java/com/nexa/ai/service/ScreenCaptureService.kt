package com.nexa.ai.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.Base64
import android.util.Log
import androidx.core.app.NotificationCompat
import com.nexa.ai.gemini.GeminiLiveSocket
import java.io.ByteArrayOutputStream

/**
 * Foreground Service for Real-time Screen Sharing to Gemini Multimodal Live API
 * Captures display frames via MediaProjection and streams JPEG buffers directly over WebSocket
 */
class ScreenCaptureService : Service() {

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var handlerThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null

    private var isStreaming = false
    private var lastFrameTime = 0L
    private val frameIntervalMs = 800L // 1-2 frames per second optimal for Multimodal Gemini Live

    companion object {
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val EXTRA_RESULT_CODE = "EXTRA_RESULT_CODE"
        const val EXTRA_DATA = "EXTRA_DATA"
        const val CHANNEL_ID = "NEXA_SCREEN_SHARE_CHANNEL"
        const val NOTIFICATION_ID = 2127
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        handlerThread = HandlerThread("ScreenCaptureThread").apply { start() }
        backgroundHandler = Handler(handlerThread!!.looper)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
                val data = intent.getParcelableExtra<Intent>(EXTRA_DATA)
                if (data != null) {
                    startForeground(NOTIFICATION_ID, buildNotification())
                    startScreenCapture(resultCode, data)
                }
            }
            ACTION_STOP -> {
                stopScreenCapture()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun startScreenCapture(resultCode: Int, data: Intent) {
        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = projectionManager.getMediaProjection(resultCode, data)

        val metrics = resources.displayMetrics
        val width = 720
        val height = 1280
        val density = metrics.densityDpi

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "NexaScreenShare",
            width, height, density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface, null, backgroundHandler
        )

        isStreaming = true

        imageReader?.setOnImageAvailableListener({ reader ->
            if (!isStreaming) return@setOnImageAvailableListener
            val now = System.currentTimeMillis()
            if (now - lastFrameTime < frameIntervalMs) {
                val image = reader.acquireLatestImage()
                image?.close()
                return@setOnImageAvailableListener
            }
            lastFrameTime = now

            val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
            try {
                val planes = image.planes
                val buffer = planes[0].buffer
                val pixelStride = planes[0].pixelStride
                val rowStride = planes[0].rowStride
                val rowPadding = rowStride - pixelStride * width

                val bitmap = Bitmap.createBitmap(
                    width + rowPadding / pixelStride,
                    height,
                    Bitmap.Config.ARGB_8888
                )
                bitmap.copyPixelsFromBuffer(buffer)
                image.close()

                val cleanBitmap = if (rowPadding > 0) Bitmap.createBitmap(bitmap, 0, 0, width, height) else bitmap

                val outputStream = ByteArrayOutputStream()
                cleanBitmap.compress(Bitmap.CompressFormat.JPEG, 65, outputStream)
                val jpegBytes = outputStream.toByteArray()

                val base64Frame = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)
                GeminiLiveSocket.sendRealtimeScreenFrame(base64Frame)

            } catch (e: Exception) {
                Log.e("ScreenCaptureService", "Frame capture error: ${e.message}")
            }
        }, backgroundHandler)
    }

    private fun stopScreenCapture() {
        isStreaming = false
        virtualDisplay?.release()
        virtualDisplay = null
        imageReader?.close()
        imageReader = null
        mediaProjection?.stop()
        mediaProjection = null
    }

    override fun onDestroy() {
        stopScreenCapture()
        handlerThread?.quitSafely()
        super.onDestroy()
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Nexa AI Screen Vision Active")
            .setContentText("Gemini is viewing and analyzing your live screen")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Nexa Screen Share Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
