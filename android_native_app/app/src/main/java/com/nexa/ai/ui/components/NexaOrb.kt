package com.nexa.ai.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import com.nexa.ai.ui.theme.NexaCyan
import com.nexa.ai.ui.theme.NexaPurple

/**
 * Pure Native Jetpack Compose Nexa Holographic Orb
 * Renders glowing pulsing core, rotating sci-fi gimbal rings & radar sweep
 */
@Composable
fun NexaOrb(
    modifier: Modifier = Modifier,
    isSpeaking: Boolean = false,
    audioEnergy: Float = 0.5f // 0.0 to 1.0 reactive voice energy
) {
    val infiniteTransition = rememberInfiniteTransition(label = "NexaOrbAnimations")

    // Rotation angles
    val rotationZ by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 8000, easing = LinearEasing)
        ),
        label = "RotationZ"
    )

    val counterRotationZ by infiniteTransition.animateFloat(
        initialValue = 360f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 12000, easing = LinearEasing)
        ),
        label = "CounterRotationZ"
    )

    // Breathing pulse scale
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "PulseScale"
    )

    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2, size.height / 2)
            val baseRadius = (size.minDimension / 4) * (pulseScale + (audioEnergy * 0.15f))

            // 1. Outer Hologram Glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        NexaCyan.copy(alpha = 0.35f),
                        NexaPurple.copy(alpha = 0.15f),
                        Color.Transparent
                    ),
                    center = center,
                    radius = baseRadius * 2.2f
                ),
                radius = baseRadius * 2.2f,
                center = center
            )

            // 2. Glowing Core Orb
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color.White,
                        NexaCyan,
                        NexaPurple,
                        Color(0xFF0F172A)
                    ),
                    center = center,
                    radius = baseRadius
                ),
                radius = baseRadius,
                center = center
            )

            // 3. Sci-Fi Rotating Radar Ring 1 (Dashed)
            rotate(rotationZ, pivot = center) {
                drawCircle(
                    color = NexaCyan.copy(alpha = 0.6f),
                    radius = baseRadius * 1.35f,
                    center = center,
                    style = Stroke(
                        width = 4f,
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(24f, 16f))
                    )
                )
            }

            // 4. Sci-Fi Counter Rotating Gimbal Ring 2
            rotate(counterRotationZ, pivot = center) {
                drawCircle(
                    color = NexaPurple.copy(alpha = 0.5f),
                    radius = baseRadius * 1.65f,
                    center = center,
                    style = Stroke(
                        width = 3f,
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(40f, 20f, 10f, 20f))
                    )
                )
            }
        }
    }
}
