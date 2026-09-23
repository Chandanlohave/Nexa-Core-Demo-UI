package com.nexa.ai.gemini

import android.util.Log
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Native WebSocket Client for Gemini Multimodal Live API (v1alpha)
 * Handles bidirectional low-latency audio & real-time screen image frames
 */
object GeminiLiveSocket {
    private const val TAG = "GeminiLiveSocket"
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    var isConnected = false
        private set

    fun connect(apiKey: String, onTextReceived: (String) -> Unit) {
        val host = "generativelanguage.googleapis.com"
        val path = "/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
        val url = "wss://$host$path?key=$apiKey"

        val request = Request.Builder().url(url).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                isConnected = true
                Log.d(TAG, "Connected to Gemini Live WebSocket")
                sendInitialHandshakeSetup()
            }

            override fun onMessage(ws: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    if (json.has("serverContent")) {
                        val serverContent = json.getJSONObject("serverContent")
                        if (serverContent.has("modelTurn")) {
                            val parts = serverContent.getJSONObject("modelTurn").getJSONArray("parts")
                            for (i in 0 until parts.length()) {
                                val part = parts.getJSONObject(i)
                                if (part.has("text")) {
                                    onTextReceived(part.getString("text"))
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing server message: ${e.message}")
                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                isConnected = false
                Log.e(TAG, "Gemini Live Failure: ${t.message}")
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                isConnected = false
                ws.close(code, reason)
            }
        })
    }

    private fun sendInitialHandshakeSetup() {
        val setupPayload = JSONObject().apply {
            put("setup", JSONObject().apply {
                put("model", "models/gemini-2.5-flash")
                put("generationConfig", JSONObject().apply {
                    put("responseModalities", org.json.JSONArray().apply {
                        put("AUDIO")
                        put("TEXT")
                    })
                })
            })
        }
        webSocket?.send(setupPayload.toString())
    }

    /**
     * Send live screen capture image frame to Gemini
     */
    fun sendRealtimeScreenFrame(base64Jpeg: String) {
        if (!isConnected || webSocket == null) return

        val payload = JSONObject().apply {
            put("realtimeInput", JSONObject().apply {
                put("mediaChunks", org.json.JSONArray().apply {
                    put(JSONObject().apply {
                        put("mimeType", "image/jpeg")
                        put("data", base64Jpeg)
                    })
                })
            })
        }
        webSocket?.send(payload.toString())
    }

    fun disconnect() {
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        isConnected = false
    }
}
