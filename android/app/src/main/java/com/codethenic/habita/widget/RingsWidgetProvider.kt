package com.codethenic.habita.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import android.widget.RemoteViews
import com.codethenic.habita.R

class RingsWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    try {
      updateAppWidgets(context, appWidgetManager, appWidgetIds)
    } catch (_: Exception) {
    }
  }

  companion object {

    private val RING_IDS = listOf(
      R.id.ring_0, R.id.ring_1, R.id.ring_2, R.id.ring_3, R.id.ring_4,
      R.id.ring_5, R.id.ring_6, R.id.ring_7, R.id.ring_8, R.id.ring_9,
    )

    fun updateAppWidgets(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetIds: IntArray,
    ) {
      try {
        val (rings, configured) = RingsWidgetStore.snapshot(context)
        val lock = RingsWidgetStore.lockState(context)
        for (widgetId in appWidgetIds) {
          val views = buildWidgetViews(context, rings, configured, lock, widgetId)
          appWidgetManager.updateAppWidget(widgetId, views)
        }
      } catch (_: Exception) {
      }
    }

    private fun buildWidgetViews(
      context: Context,
      rings: List<RingsWidgetStore.RingHabit>,
      configured: Boolean,
      lock: RingsWidgetStore.WidgetLock,
      widgetId: Int,
    ): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.rings_widget)

      if (lock.locked) {
        views.setViewVisibility(R.id.rings_empty, View.VISIBLE)
        views.setViewVisibility(R.id.rings_row_1, View.GONE)
        views.setViewVisibility(R.id.rings_row_2, View.GONE)
        views.setTextViewText(
          R.id.rings_empty_text,
          if (lock.expired) "Pro expired — tap to renew" else "Widgets are Pro — tap to upgrade",
        )
        setPaywallIntent(context, views)
        return views
      }

      if (rings.isEmpty()) {
        views.setViewVisibility(R.id.rings_empty, View.VISIBLE)
        views.setViewVisibility(R.id.rings_row_1, View.GONE)
        views.setViewVisibility(R.id.rings_row_2, View.GONE)
        views.setTextViewText(
          R.id.rings_empty_text,
          if (configured) "Select habits in the app" else "No habits yet",
        )
        setOpenAppIntent(context, views)
        return views
      }

      views.setViewVisibility(R.id.rings_empty, View.GONE)
      views.setViewVisibility(R.id.rings_row_1, View.VISIBLE)
      views.setViewVisibility(R.id.rings_row_2, View.VISIBLE)

      val shown = rings.take(WidgetModule.MAX_RINGS)
      for (index in RING_IDS.indices) {
        val viewId = RING_IDS[index]
        if (index < shown.size) {
          val ring = shown[index]
          views.setViewVisibility(viewId, View.VISIBLE)
          views.setImageViewBitmap(viewId, ringBitmap(ring))
          views.setContentDescription(viewId, ring.name)
          views.setOnClickPendingIntent(viewId, togglePendingIntent(context, widgetId, index, ring.id))
        } else {
          views.setViewVisibility(viewId, View.INVISIBLE)
          views.setOnClickPendingIntent(viewId, null)
        }
      }

      setOpenAppIntent(context, views)
      return views
    }

    private fun togglePendingIntent(
      context: Context,
      widgetId: Int,
      index: Int,
      habitId: String,
    ): PendingIntent {
      val intent = Intent(context, HabitRingsActionReceiver::class.java).apply {
        action = WidgetModule.RINGS_TOGGLE_ACTION
        putExtra(WidgetModule.EXTRA_HABIT_ID, habitId)
      }
      // Unique request code per widget + cell so taps route to the right habit.
      val requestCode = widgetId * 100 + index
      return PendingIntent.getBroadcast(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    private fun setOpenAppIntent(context: Context, views: RemoteViews) {
      val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val pendingIntent = PendingIntent.getActivity(
        context,
        1,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(R.id.rings_container, pendingIntent)
    }

    /** Locked-card tap: deep-link straight into the paywall (source `widget`). */
    private fun setPaywallIntent(context: Context, views: RemoteViews) {
      val intent = Intent(
        Intent.ACTION_VIEW,
        android.net.Uri.parse(WidgetModule.PAYWALL_DEEP_LINK),
      ).setPackage(context.packageName)
      val pendingIntent = PendingIntent.getActivity(
        context,
        2,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(R.id.rings_container, pendingIntent)
    }

    /** Render the dark ring + progress arc + centered glyph, like the reference UI. */
    private fun ringBitmap(ring: RingsWidgetStore.RingHabit): Bitmap {
      val size = 144
      val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bmp)
      val center = size / 2f
      val stroke = size * 0.095f
      val radius = center - stroke / 2f - 2f

      val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        color = withAlpha(ring.color, 0.28f)
      }
      canvas.drawCircle(center, center, radius, track)

      if (ring.progress > 0f) {
        val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
          style = Paint.Style.STROKE
          strokeWidth = stroke
          strokeCap = Paint.Cap.ROUND
          color = ring.color
        }
        val oval = RectF(center - radius, center - radius, center + radius, center + radius)
        canvas.drawArc(oval, -90f, 360f * maxOf(ring.progress, 0.03f), false, arc)
      }

      val glyph = RingsWidgetStore.glyphFor(ring.iconKey)
      if (glyph.isNotEmpty()) {
        val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
          textSize = size * 0.40f
          textAlign = Paint.Align.CENTER
        }
        val fm = text.fontMetrics
        val y = center - (fm.ascent + fm.descent) / 2f
        canvas.drawText(glyph, center, y, text)
      } else {
        val letter = ring.name.firstOrNull()?.uppercase() ?: "•"
        val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
          textSize = size * 0.44f
          textAlign = Paint.Align.CENTER
          isFakeBoldText = true
          color = ring.color
        }
        val fm = text.fontMetrics
        val y = center - (fm.ascent + fm.descent) / 2f
        canvas.drawText(letter, center, y, text)
      }
      return bmp
    }

    private fun withAlpha(color: Int, alpha: Float): Int {
      val a = (alpha.coerceIn(0f, 1f) * 255).toInt()
      return (color and 0x00FFFFFF) or (a shl 24)
    }
  }
}
