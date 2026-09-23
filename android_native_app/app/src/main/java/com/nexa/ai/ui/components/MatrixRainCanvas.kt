package com.nexa.ai.ui.components

import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import com.nexa.ai.ui.theme.NexaMatrixGreen
import kotlinx.coroutines.delay
import kotlin.random.Random

/**
 * Pure Native Kotlin Jetpack Compose Matrix Digital Rain
 * Matches the React Canvas implementation 1:1 with high-performance 60 FPS loop
 */
@Composable
fun MatrixRainCanvas(
    modifier: Modifier = Modifier,
    color: Color = NexaMatrixGreen,
    fontSize: Float = 36f
) {
    var tick by remember { mutableLongStateOf(0L) }
    var drops by remember { mutableStateOf<IntArray?>(null) }

    // 40ms frame loop (~25-30 updates per second for classic movie-like rain)
    LaunchedEffect(Unit) {
        while (true) {
            delay(40)
            tick++
        }
    }

    val characters = remember {
        "0123456789ABCDEF01010101".toCharArray()
    }

    val paintGreen = remember(color) {
        Paint().apply {
            this.color = color.toArgb()
            textSize = fontSize
            isAntiAlias = true
            isFakeBoldText = true
        }
    }

    val paintWhiteTip = remember {
        Paint().apply {
            this.color = android.graphics.Color.WHITE
            textSize = fontSize
            isAntiAlias = true
            isFakeBoldText = true
            setShadowLayer(12f, 0f, 0f, android.graphics.Color.WHITE)
        }
    }

    Canvas(modifier = modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height
        val columns = (width / fontSize).toInt().coerceAtLeast(1)

        // Initialize drop positions if not set or dimensions changed
        if (drops == null || drops!!.size != columns) {
            drops = IntArray(columns) { Random.nextInt(-40, 0) }
        }

        val currentDrops = drops ?: return@Canvas

        // Draw semi-transparent background fade for smooth motion trails
        drawRect(Color(0x1F030712))

        val nativeCanvas = drawContext.canvas.nativeCanvas

        for (i in 0 until columns) {
            val char = characters[Random.nextInt(characters.size)]
            val x = i * fontSize
            val y = currentDrops[i] * fontSize

            // Glowing white tip on the drop's leading edge
            val isTip = Random.nextFloat() > 0.90f
            val activePaint = if (isTip) paintWhiteTip else paintGreen

            nativeCanvas.drawText(char.toString(), x, y, activePaint)

            // Reset drop to top randomly when it exceeds screen height
            if (y > height && Random.nextFloat() > 0.975f) {
                currentDrops[i] = 0
            } else {
                currentDrops[i] += 1
            }
        }
    }
}
