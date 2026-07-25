package com.habittracker.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import com.habittracker.R
import org.json.JSONObject
import java.util.Calendar

class HabitWidgetProvider : AppWidgetProvider() {

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

    private val INCOMPLETE = Color.parseColor("#DADFE7")

    fun updateAppWidgets(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetIds: IntArray,
    ) {
      try {
        val prefs = context.getSharedPreferences(WidgetModule.PREFS_NAME, 0)
        val json = prefs.getString(WidgetModule.HABIT_DATA_KEY, null)
        val selectedIds =
          prefs.getStringSet(WidgetModule.SELECTED_IDS_KEY, emptySet()) ?: emptySet()

        for (widgetId in appWidgetIds) {
          val views = buildWidgetViews(context, json, selectedIds)
          appWidgetManager.updateAppWidget(widgetId, views)
        }
      } catch (_: Exception) {
      }
    }

    private fun buildWidgetViews(
      context: Context,
      json: String?,
      selectedIds: Set<String>,
    ): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.habit_widget)

      if (json.isNullOrEmpty() || selectedIds.isEmpty()) {
        showEmptyState(views)
        setTapIntent(context, views)
        return views
      }

      val payload = try {
        JSONObject(json)
      } catch (_: Exception) {
        showEmptyState(views)
        setTapIntent(context, views)
        return views
      }

      val habitsArray = payload.optJSONArray("habits")
      if (habitsArray == null || habitsArray.length() == 0) {
        showEmptyState(views)
        setTapIntent(context, views)
        return views
      }

      val rowIds = listOf(R.id.habit_row_1, R.id.habit_row_2, R.id.habit_row_3)
      val dotIds = listOf(R.id.dot_1, R.id.dot_2, R.id.dot_3)
      val nameIds = listOf(R.id.name_1, R.id.name_2, R.id.name_3)
      val dayIds = listOf(
        listOf(R.id.day_1_0, R.id.day_1_1, R.id.day_1_2, R.id.day_1_3, R.id.day_1_4, R.id.day_1_5, R.id.day_1_6),
        listOf(R.id.day_2_0, R.id.day_2_1, R.id.day_2_2, R.id.day_2_3, R.id.day_2_4, R.id.day_2_5, R.id.day_2_6),
        listOf(R.id.day_3_0, R.id.day_3_1, R.id.day_3_2, R.id.day_3_3, R.id.day_3_4, R.id.day_3_5, R.id.day_3_6),
      )

      val todayKey = todayKey()
      val WHITE = Color.parseColor("#FFFFFF")
      val TODAY_TEXT = Color.parseColor("#3A4250")

      var habitIndex = 0
      for (i in 0 until habitsArray.length()) {
        if (habitIndex >= 3) break
        val habitObj = habitsArray.optJSONObject(i) ?: continue
        val habitId = habitObj.optString("id", "")
        if (habitId !in selectedIds) continue

        val colorStr = habitObj.optString("color", "#34C759")
        val name = habitObj.optString("name", "Habit")
        val completionsObj = habitObj.optJSONObject("completions") ?: JSONObject()
        val habitColor = parseColor(colorStr)

        views.setViewVisibility(rowIds[habitIndex], View.VISIBLE)
        views.setTextColor(dotIds[habitIndex], habitColor)
        views.setTextViewText(nameIds[habitIndex], name)

        for (day in 0..6) {
          val dateKey = dateKeyForOffset(day)
          val completed = completionsObj.optBoolean(dateKey, false)
          val isToday = dateKey == todayKey
          val cellId = dayIds[habitIndex][day]

          views.setInt(cellId, "setBackgroundColor", if (completed) habitColor else INCOMPLETE)

          if (completed) {
            views.setTextViewText(cellId, "✓")
            views.setTextColor(cellId, WHITE)
          } else if (isToday) {
            views.setTextViewText(cellId, "○")
            views.setTextColor(cellId, TODAY_TEXT)
          } else {
            views.setTextViewText(cellId, "")
          }
        }

        habitIndex++
      }

      for (i in habitIndex until 3) {
        views.setViewVisibility(rowIds[i], View.GONE)
      }

      if (habitIndex == 0) {
        views.setViewVisibility(R.id.empty_state, View.VISIBLE)
      } else {
        views.setViewVisibility(R.id.empty_state, View.GONE)
      }

      setTapIntent(context, views)
      return views
    }

    private fun showEmptyState(views: RemoteViews) {
      views.setViewVisibility(R.id.empty_state, View.VISIBLE)
      views.setViewVisibility(R.id.habit_row_1, View.GONE)
      views.setViewVisibility(R.id.habit_row_2, View.GONE)
      views.setViewVisibility(R.id.habit_row_3, View.GONE)
    }

    private fun parseColor(hex: String): Int {
      return try {
        Color.parseColor(hex)
      } catch (_: Exception) {
        Color.parseColor("#34C759")
      }
    }

    private fun todayKey(): String {
      val cal = Calendar.getInstance()
      val y = cal.get(Calendar.YEAR)
      val m = String.format("%02d", cal.get(Calendar.MONTH) + 1)
      val d = String.format("%02d", cal.get(Calendar.DAY_OF_MONTH))
      return "$y-$m-$d"
    }

    private fun dateKeyForOffset(dayOffset: Int): String {
      val cal = Calendar.getInstance()
      val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
      val daysSinceSunday = (dayOfWeek - Calendar.SUNDAY + 7) % 7
      cal.add(Calendar.DAY_OF_MONTH, -daysSinceSunday + dayOffset)
      val y = cal.get(Calendar.YEAR)
      val m = String.format("%02d", cal.get(Calendar.MONTH) + 1)
      val d = String.format("%02d", cal.get(Calendar.DAY_OF_MONTH))
      return "$y-$m-$d"
    }

    private fun setTapIntent(context: Context, views: RemoteViews) {
      val intent =
        context.packageManager.getLaunchIntentForPackage(context.packageName)
      val pendingIntent = PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
    }
  }
}
