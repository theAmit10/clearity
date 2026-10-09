package com.codethenic.habita.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.SharedPreferences
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import org.json.JSONArray

class WidgetModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val prefs: SharedPreferences by lazy {
    reactContext.getSharedPreferences(PREFS_NAME, 0)
  }

  override fun getName(): String = "WidgetModule"

  @ReactMethod
  fun setSelectedHabitIds(ids: ReadableArray) {
    val list = mutableListOf<String>()
    for (i in 0 until ids.size()) {
      ids.getString(i)?.let { list.add(it) }
    }
    prefs.edit().putStringSet(SELECTED_IDS_KEY, list.toSet()).apply()
    reloadWidget()
  }

  @ReactMethod
  fun getSelectedHabitIds(promise: Promise) {
    val ids = prefs.getStringSet(SELECTED_IDS_KEY, emptySet()) ?: emptySet()
    promise.resolve(ids.toList())
  }

  @ReactMethod
  fun updateWidgetData(json: String) {
    prefs.edit().putString(HABIT_DATA_KEY, json).apply()
    reloadWidget()
  }

  @ReactMethod
  fun setRingsHabitIds(ids: ReadableArray) {
    val list = mutableListOf<String>()
    for (i in 0 until ids.size()) {
      ids.getString(i)?.let { list.add(it) }
    }
    prefs.edit().putStringSet(RINGS_IDS_KEY, list.toSet()).apply()
    reloadWidget()
  }

  @ReactMethod
  fun getRingsHabitIds(promise: Promise) {
    val ids = prefs.getStringSet(RINGS_IDS_KEY, emptySet()) ?: emptySet()
    promise.resolve(ids.toList())
  }

  /** Drain ops queued by Today Rings taps. Resolves the JSON array and clears it. */
  @ReactMethod
  fun consumePendingToggles(promise: Promise) {
    try {
      val json = prefs.getString(PENDING_KEY, "[]") ?: "[]"
      prefs.edit().remove(PENDING_KEY).apply()
      // Validate it parses; fall back to empty on corruption.
      try {
        JSONArray(json)
      } catch (_: Exception) {
        promise.resolve("[]")
        return
      }
      promise.resolve(json)
    } catch (e: Exception) {
      promise.reject("CONSUME_FAILED", e.message)
    }
  }

  @ReactMethod
  fun reloadWidget() {
    try {
      val ctx = reactContext.applicationContext
      val manager = AppWidgetManager.getInstance(ctx)
      val heatmap = ComponentName(ctx, HabitWidgetProvider::class.java)
      val heatmapIds = manager.getAppWidgetIds(heatmap)
      if (heatmapIds.isNotEmpty()) {
        HabitWidgetProvider.updateAppWidgets(ctx, manager, heatmapIds)
      }
      val rings = ComponentName(ctx, RingsWidgetProvider::class.java)
      val ringsIds = manager.getAppWidgetIds(rings)
      if (ringsIds.isNotEmpty()) {
        RingsWidgetProvider.updateAppWidgets(ctx, manager, ringsIds)
      }
    } catch (_: Exception) {
      // silently fail
    }
  }

  companion object {
    const val PREFS_NAME = "com.codethenic.habita.widget_prefs"
    const val SELECTED_IDS_KEY = "selectedWidgetHabitIds"
    const val RINGS_IDS_KEY = "ringsWidgetHabitIds"
    const val HABIT_DATA_KEY = "widgetHabitData"
    const val PENDING_KEY = "widgetPendingToggles"
    const val RINGS_TOGGLE_ACTION = "com.codethenic.habita.widget.RINGS_TOGGLE"
    const val EXTRA_HABIT_ID = "habit_id"
    const val MAX_RINGS = 10
    /** Locked-widget tap target — JS routes it into the paywall (source `widget`). */
    const val PAYWALL_DEEP_LINK = "habita://paywall?source=widget"
  }
}
