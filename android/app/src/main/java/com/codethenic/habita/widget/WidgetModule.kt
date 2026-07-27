package com.codethenic.habita.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.SharedPreferences
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

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
  fun reloadWidget() {
    try {
      val ctx = reactContext.applicationContext
      val manager = AppWidgetManager.getInstance(ctx)
      val widget = ComponentName(ctx, HabitWidgetProvider::class.java)
      val ids = manager.getAppWidgetIds(widget)
      if (ids.isNotEmpty()) {
        HabitWidgetProvider.updateAppWidgets(ctx, manager, ids)
      }
    } catch (_: Exception) {
      // silently fail
    }
  }

  companion object {
    const val PREFS_NAME = "com.codethenic.habita.widget_prefs"
    const val SELECTED_IDS_KEY = "selectedWidgetHabitIds"
    const val HABIT_DATA_KEY = "widgetHabitData"
  }
}
