package com.nexa.ai

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nexa.ai.service.ScreenCaptureService
import com.nexa.ai.ui.components.MatrixRainCanvas
import com.nexa.ai.ui.components.NexaOrb
import com.nexa.ai.ui.theme.*

class MainActivity : ComponentActivity() {

    private var isScreenSharing by mutableStateOf(false)
    private var uiMode by mutableStateOf("ORB") // "ORB" or "MATRIX"
    private var aiSpeechResponse by mutableStateOf("NEXA COGNITIVE OS ACTIVE // STANDING BY")

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            NexaAppUI(
                uiMode = uiMode,
                isScreenSharing = isScreenSharing,
                aiResponse = aiSpeechResponse,
                onToggleUIMode = {
                    uiMode = if (uiMode == "ORB") "MATRIX" else "ORB"
                },
                onToggleScreenShare = {
                    if (isScreenSharing) {
                        val stopIntent = Intent(this, ScreenCaptureService::class.java).apply {
                            action = ScreenCaptureService.ACTION_STOP
                        }
                        startService(stopIntent)
                        isScreenSharing = false
                        Toast.makeText(this, "Screen share stopped", Toast.LENGTH_SHORT).show()
                    } else {
                        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                        screenCaptureLauncher.launch(projectionManager.createScreenCaptureIntent())
                    }
                }
            )
        }
    }
}

@Composable
fun NexaAppUI(
    uiMode: String,
    isScreenSharing: Boolean,
    aiResponse: String,
    onToggleUIMode: () -> Unit,
    onToggleScreenShare: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(NexaBackground)
    ) {
        // --- 1. Background Visuals ---
        if (uiMode == "MATRIX") {
            MatrixRainCanvas(modifier = Modifier.fillMaxSize())
        } else {
            NexaOrb(modifier = Modifier.fillMaxSize())
        }

        // --- 2. Top Header Telemetry Bar ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 44.dp, start = 20.dp, end = 20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "NEXA // QUANTUM OS",
                    color = NexaCyan,
                    fontSize = 14.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = if (isScreenSharing) "● LIVE SCREEN LINK ACTIVE" else "● NEURAL ENGINE IDLE",
                    color = if (isScreenSharing) NexaMatrixGreen else NexaTextSecondary,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace
                )
            }

            // Mode Switch Button (Orb vs Matrix)
            Button(
                onClick = onToggleUIMode,
                colors = ButtonDefaults.buttonColors(containerColor = NexaSurface),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.border(1.dp, NexaCyan.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
            ) {
                Text(
                    text = if (uiMode == "ORB") "🌐 MATRIX" else "⭕ ORB",
                    color = NexaCyan,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // --- 3. Bottom Controls & Screen Share Bar ---
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Live AI Speech Response Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(NexaSurface.copy(alpha = 0.9f))
                    .border(1.dp, if (isScreenSharing) NexaMatrixGreen.copy(alpha = 0.5f) else NexaBorder, RoundedCornerShape(12.dp))
                    .padding(14.dp)
            ) {
                Text(
                    text = aiResponse,
                    color = NexaTextPrimary,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Action Buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Gemini Live Screen Share Button
                IconButton(
                    onClick = onToggleScreenShare,
                    modifier = Modifier
                        .size(64.dp)
                        .background(
                            brush = Brush.radialGradient(
                                colors = if (isScreenSharing) listOf(NexaWarningRed, Color(0xFF7F1D1D))
                                else listOf(NexaMatrixGreen, Color(0xFF064E3B))
                            ),
                            shape = CircleShape
                        )
                        .border(2.dp, if (isScreenSharing) NexaWarningRed else NexaMatrixGreen, CircleShape)
                ) {
                    Text(
                        text = if (isScreenSharing) "STOP" else "SCREEN",
                        color = Color.Black,
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}
