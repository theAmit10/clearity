package com.codethenic.habita.widget

import android.content.Context
import android.content.SharedPreferences
import android.graphics.Color
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Shared Today Rings logic: payload parsing, ring progress (mirrors the app's
 * HabitCard ring + Monday-start weeks from habitStore.ts), toggling, and the
 * pending-op queue the JS side reconciles on launch/foreground.
 */
object RingsWidgetStore {

  data class RingHabit(
    val id: String,
    val name: String,
    val color: Int,
    val iconKey: String,
    val progress: Float,
    val done: Boolean,
  )

  data class PendingOp(val habitId: String, val dateKey: String, val value: Int)

  /** Pro-gate state carried by the JS payload (`locked` / `lockMode`). */
  data class WidgetLock(val locked: Boolean, val expired: Boolean)

  fun lockState(context: Context): WidgetLock {
    return try {
      val json = prefs(context).getString(WidgetModule.HABIT_DATA_KEY, null)
        ?: return WidgetLock(false, false)
      val payload = JSONObject(json)
      WidgetLock(
        payload.optBoolean("locked", false),
        payload.optString("lockMode", "") == "expired",
      )
    } catch (_: Exception) {
      WidgetLock(false, false)
    }
  }

  fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(WidgetModule.PREFS_NAME, 0)

  fun todayKey(): String {
    val cal = Calendar.getInstance()
    return keyOf(cal)
  }

  private fun keyOf(cal: Calendar): String {
    val y = cal.get(Calendar.YEAR)
    val m = String.format("%02d", cal.get(Calendar.MONTH) + 1)
    val d = String.format("%02d", cal.get(Calendar.DAY_OF_MONTH))
    return "$y-$m-$d"
  }

  private fun keyByAddingDays(offset: Int): String {
    val cal = Calendar.getInstance()
    cal.add(Calendar.DAY_OF_MONTH, offset)
    return keyOf(cal)
  }

  /** Monday-start week containing today (mirrors getWeekStart in habitStore.ts). */
  private fun mondayStartKeys(): List<String> {
    val cal = Calendar.getInstance()
    // Calendar.SUNDAY = 1 ... SATURDAY = 7; daysBack maps Mon->0 ... Sun->6.
    val weekday = cal.get(Calendar.DAY_OF_WEEK)
    val daysBack = (weekday + 5) % 7
    cal.add(Calendar.DAY_OF_MONTH, -daysBack)
    return (0..6).map {
      val key = keyOf(cal)
      cal.add(Calendar.DAY_OF_MONTH, 1)
      key
    }
  }

  fun parseColor(hex: String): Int {
    return try {
      Color.parseColor(hex)
    } catch (_: Exception) {
      Color.parseColor("#34C759")
    }
  }

  private fun progressOf(
    completions: JSONObject,
    frequency: String,
    targetRaw: Int,
    windowRaw: Int,
    today: String,
  ): Pair<Float, Boolean> {
    return when (frequency) {
      "n_times_in_m_days" -> {
        val target = maxOf(1, targetRaw)
        if (target > 12) {
          val window = maxOf(1, windowRaw)
          var sum = 0
          for (i in 0 until window) sum += completions.optInt(keyByAddingDays(-i), 0)
          Pair((sum.toFloat() / target).coerceAtMost(1f), sum >= target)
        } else {
          val current = completions.optInt(today, 0)
          Pair((current.toFloat() / target).coerceAtMost(1f), current >= target)
        }
      }
      "n_times_per_week" -> {
        val target = maxOf(1, if (targetRaw > 0) targetRaw else 3)
        var sum = 0
        for (key in mondayStartKeys()) sum += completions.optInt(key, 0)
        Pair((sum.toFloat() / target).coerceAtMost(1f), sum >= target)
      }
      "n_times_per_month" -> {
        val target = maxOf(1, if (targetRaw > 0) targetRaw else 1)
        val prefix = today.substring(0, 7)
        var sum = 0
        val keys = completions.keys()
        while (keys.hasNext()) {
          val k = keys.next()
          if (k.startsWith(prefix)) sum += completions.optInt(k, 0)
        }
        Pair((sum.toFloat() / target).coerceAtMost(1f), sum >= target)
      }
      else -> {
        val current = completions.optInt(today, 0)
        Pair(if (current > 0) 1f else 0f, current > 0)
      }
    }
  }

  /**
   * Ordered ring habits for the widget. When the user never configured a
   * selection (key absent), falls back to the first habits in the payload.
   */
  fun snapshot(context: Context): Pair<List<RingHabit>, Boolean> {
    val prefs = prefs(context)
    val hasSelection = prefs.contains(WidgetModule.RINGS_IDS_KEY)
    val stored = prefs.getStringSet(WidgetModule.RINGS_IDS_KEY, emptySet()) ?: emptySet()
    val json = prefs.getString(WidgetModule.HABIT_DATA_KEY, null) ?: return Pair(emptyList(), hasSelection)
    val today = todayKey()
    return try {
      val payload = JSONObject(json)
      val arr = payload.optJSONArray("habits") ?: return Pair(emptyList(), hasSelection)
      val all = mutableListOf<Triple<JSONObject, JSONObject, Int>>()
      for (i in 0 until arr.length()) {
        val h = arr.optJSONObject(i) ?: continue
        all.add(Triple(h, h.optJSONObject("completions") ?: JSONObject(), i))
      }
      val ordered = if (hasSelection) {
        val byId = all.associateBy { it.first.optString("id", "") }
        stored.mapNotNull { byId[it] }.take(WidgetModule.MAX_RINGS)
      } else {
        all.take(WidgetModule.MAX_RINGS)
      }
      val rings = ordered.map { (h, completions) ->
        val freq = h.optString("frequency", "daily").ifEmpty { "daily" }
        val (p, done) = progressOf(
          completions, freq,
          h.optInt("frequencyValue", 0), h.optInt("frequencyWindow", 0), today,
        )
        RingHabit(
          id = h.optString("id", ""),
          name = h.optString("name", "Habit"),
          color = parseColor(h.optString("color", "#34C759")),
          iconKey = h.optString("icon", "fire").ifEmpty { "fire" },
          progress = p,
          done = done,
        )
      }.filter { it.id.isNotEmpty() }
      Pair(rings, hasSelection)
    } catch (_: Exception) {
      Pair(emptyList(), hasSelection)
    }
  }

  /**
   * Toggle today's completion for [habitId] (mirrors toggleCompletion).
   * Returns the op queued for JS reconciliation, or null if unknown.
   */
  fun toggle(context: Context, habitId: String): PendingOp? {
    val prefs = prefs(context)
    val json = prefs.getString(WidgetModule.HABIT_DATA_KEY, null) ?: return null
    val today = todayKey()
    return try {
      val payload = JSONObject(json)
      // Locked widgets render the Pro upsell with no toggle targets —
      // never mutate or queue from a stale cached card.
      if (payload.optBoolean("locked", false)) return null
      val arr = payload.optJSONArray("habits") ?: return null
      var found: JSONObject? = null
      for (i in 0 until arr.length()) {
        val h = arr.optJSONObject(i) ?: continue
        if (h.optString("id", "") == habitId) {
          found = h
          break
        }
      }
      val habit = found ?: return null
      val freq = habit.optString("frequency", "daily")
      val target = if (freq == "n_times_in_m_days") maxOf(1, habit.optInt("frequencyValue", 1)) else 1
      val completions = habit.optJSONObject("completions") ?: JSONObject()
      val current = completions.optInt(today, 0)
      val next = if (current >= target) 0 else current + 1
      if (next > 0) completions.put(today, next) else completions.remove(today)
      habit.put("completions", completions)
      prefs.edit().putString(WidgetModule.HABIT_DATA_KEY, payload.toString()).apply()

      val op = PendingOp(habitId, today, next)
      appendPending(prefs, op)
      op
    } catch (_: Exception) {
      null
    }
  }

  private fun appendPending(prefs: SharedPreferences, op: PendingOp) {
    try {
      val existing = prefs.getString(WidgetModule.PENDING_KEY, "[]") ?: "[]"
      val arr = try {
        JSONArray(existing)
      } catch (_: Exception) {
        JSONArray()
      }
      arr.put(
        JSONObject()
          .put("habitId", op.habitId)
          .put("dateKey", op.dateKey)
          .put("value", op.value)
          .put("timestamp", System.currentTimeMillis() / 1000.0),
      )
      // Cap the queue so it can't grow unbounded.
      val capped = if (arr.length() > 200) {
        val tail = JSONArray()
        for (i in arr.length() - 200 until arr.length()) tail.put(arr.get(i))
        tail
      } else {
        arr
      }
      prefs.edit().putString(WidgetModule.PENDING_KEY, capped.toString()).apply()
    } catch (_: Exception) {
    }
  }

  /** Heroicon key -> glyph drawn inside the ring. */
  fun glyphFor(iconKey: String): String {
    return GLYPHS[iconKey] ?: ""
  }

  // Heroicon key -> glyph, ordered like HABIT_ICONS in
  // src/constants/habitIcons.tsx. Keys must stay in parity with that catalog —
  // __tests__/widgetIconParity.test.ts fails on a missing key or a duplicate
  // glyph, so two different icons can never look identical in the widget.
  //
  // NOTE: U+26A1 defaults to *text* presentation — the trailing VS16 (U+FE0F)
  // forces color-emoji rendering, otherwise canvas.drawText paints it in the
  // default paint color. Every entry here is an emoji, so the ring color set
  // on the glyph paint is ignored (and only matters if one is ever not).
  private val GLYPHS: Map<String, String> = mapOf(
    // Fitness & body
    "fire" to "🔥",
    "bolt" to "⚡️",
    "scale" to "⚖️",
    "walk" to "🚶",
    "heart" to "❤️",
    "grooming" to "✂️",
    "no-smoking" to "🚭",
    "progress" to "📈",
    "caffeine-free" to "☕️",
    "energy-full" to "💪",
    "energy-half" to "🔋",
    "energy-low" to "🔅",
    "fingerprint" to "👆",
    "support" to "🆘",
    "safety" to "⚠️",
    "eye-care" to "👁️",
    "rest-eyes" to "😴",
    "balance" to "🧘",
    // Health & wellness
    "moon" to "🌙",
    "sun" to "☀️",
    "beaker" to "🧪",
    "smile" to "😊",
    "sparkles" to "✨",
    "shield" to "🛡️",
    "low-mood" to "😔",
    "reminder" to "🔔",
    "snooze" to "💤",
    "notification" to "📳",
    "info" to "ℹ️",
    "question" to "❓",
    "recovery" to "🔄",
    "rest" to "🛌",
    // Learning & study
    "book-open" to "📖",
    "study" to "🎓",
    "pencil" to "✏️",
    "checklist" to "📋",
    "check" to "✅",
    "clock" to "🕐",
    "calendar" to "📅",
    "idea" to "💡",
    "language" to "🔤",
    "news" to "📰",
    "puzzle" to "🧩",
    "rocket" to "🚀",
    "settings" to "⚙️",
    "bookmark" to "🔖",
    "library" to "🏛️",
    "notes" to "📝",
    "research" to "🔍",
    "math" to "➗",
    "spreadsheet" to "📑",
    "tasks" to "📌",
    // Work & productivity
    "computer" to "💻",
    "briefcase" to "💼",
    "office" to "🏢",
    "presentation" to "📽️",
    "chart" to "📊",
    "report" to "📉",
    "calculator" to "🧮",
    "dashboard" to "🗂️",
    "inbox" to "📥",
    "approved" to "☑️",
    "clipboard" to "📎",
    "trend" to "↗️",
    "queue" to "🗒️",
    "filter" to "🔽",
    // Creative & hobbies
    "camera" to "📷",
    "photo" to "🖼️",
    "paint" to "🎨",
    "swatch" to "🌈",
    "ticket" to "🎟️",
    "film" to "🎬",
    "craft" to "🧶",
    "grid" to "🔲",
    "apps" to "🎛️",
    "layout" to "📐",
    "viewfinder" to "🎯",
    "color-picker" to "🖌️",
    "gif" to "🎞️",
    "print" to "🖨️",
    // Music & media
    "music" to "🎵",
    "mic" to "🎤",
    "speaker" to "🔊",
    "mute" to "🔇",
    "radio" to "📻",
    "play" to "▶️",
    "pause" to "⏸️",
    "video" to "🎥",
    "podcast" to "🎙️",
    "tv" to "📺",
    // Money & shopping
    "money" to "💰",
    "shopping-bag" to "🛍️",
    "cart" to "🛒",
    "cash" to "💵",
    "credit-card" to "💳",
    "receipt" to "🧾",
    "refund" to "↩️",
    "wallet" to "👛",
    "shop" to "🏪",
    "euro" to "💶",
    "pound" to "💷",
    "rupee" to "💱",
    "yen" to "💴",
    // Social & people
    "friends" to "👫",
    "community" to "👪",
    "volunteer" to "🙌",
    "thumbs-up" to "👍",
    "thumbs-down" to "👎",
    "speech" to "📣",
    "call" to "📞",
    "globe" to "🌐",
    "chat" to "💬",
    "group-chat" to "👥",
    "email" to "✉️",
    "email-open" to "📨",
    "mention" to "🙋",
    "hashtag" to "#️⃣",
    "person" to "👤",
    "add-friend" to "🤝",
    "remove-friend" to "❌",
    "profile" to "🧑‍💼",
    "share" to "📤",
    "id-card" to "🆔",
    // Home & living
    "home" to "🏠",
    "house" to "🏡",
    "repair" to "🔧",
    "tools" to "🛠️",
    "key" to "🔑",
    "lock" to "🔒",
    "unlock" to "🔓",
    "window" to "🚪",
    "trash" to "🗑️",
    "gift" to "🎁",
    "folder" to "📁",
    "folder-open" to "📂",
    "storage" to "📦",
    "baking" to "🎂",
    // Travel & outdoors
    "truck" to "🚚",
    "map" to "🗺️",
    "travel" to "✈️",
    "location" to "📍",
    "globe-americas" to "🌎",
    "globe-asia" to "🌏",
    "globe-europe" to "🌍",
    "flag" to "🚩",
    // Tech & devices
    "cloud" to "☁️",
    "cpu" to "🧠",
    "code" to "⌨️",
    "terminal" to "🖥️",
    "server" to "🗄️",
    "database" to "💾",
    "wifi" to "📶",
    "signal" to "📡",
    "no-signal" to "📵",
    "mobile" to "📱",
    "tablet" to "📲",
    "qr-code" to "🔳",
    "power" to "🔌",
    "bug" to "🐛",
    "layers" to "📚",
    "data" to "🗃️",
    "link" to "🔗",
    "upload" to "⬆️",
    "download" to "⬇️",
    // Achievement
    "trophy" to "🏆",
    "star" to "⭐",
    "badge" to "🏅",
  )
}
