package com.codethenic.habita.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Handles Today Rings taps without opening the app: toggles today's
 * completion in the cached payload, queues the op for JS reconciliation,
 * and redraws the widgets optimistically.
 */
class HabitRingsActionReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != WidgetModule.RINGS_TOGGLE_ACTION) return
    try {
      val habitId = intent.getStringExtra(WidgetModule.EXTRA_HABIT_ID) ?: return
      if (habitId.isEmpty()) return
      RingsWidgetStore.toggle(context.applicationContext, habitId) ?: return

      val appContext = context.applicationContext
      val manager = AppWidgetManager.getInstance(appContext)
      val component = ComponentName(appContext, RingsWidgetProvider::class.java)
      val ids = manager.getAppWidgetIds(component)
      if (ids.isNotEmpty()) {
        RingsWidgetProvider.updateAppWidgets(appContext, manager, ids)
      }
    } catch (_: Exception) {
      // Widget taps must never crash the receiver.
    }
  }
}
