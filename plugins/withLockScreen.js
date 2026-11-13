// Lets an alarm's full-screen notification open the app over the lock screen and wake the display, and nothing else:
// a normal launch (launcher icon, recents) never shows the app over the lock screen, and it stops doing so as soon as the app leaves the screen.
const { withMainActivity } = require("expo/config-plugins");

const METHODS = `
  // Over the lock screen only when launched by something other than the launcher (an alarm's full-screen notification); cleared when the app leaves the screen.
  private fun lockScreen(on: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) { setShowWhenLocked(on); setTurnScreenOn(on) }
  }
  override fun onNewIntent(intent: android.content.Intent) { super.onNewIntent(intent); lockScreen(!intent.hasCategory(android.content.Intent.CATEGORY_LAUNCHER)) }
  override fun onStop() { super.onStop(); lockScreen(false) }
`;

module.exports = (config) =>
  withMainActivity(config, (c) => {
    let s = c.modResults.contents;
    if (s.includes("fun lockScreen(")) return c;
    if (!s.includes("super.onCreate(null)") || !/\n}\s*$/.test(s)) throw new Error("withLockScreen: MainActivity.kt has an unexpected shape");
    s = s.replace("super.onCreate(null)", "super.onCreate(null)\n    lockScreen(!intent.hasCategory(android.content.Intent.CATEGORY_LAUNCHER))");
    c.modResults.contents = s.replace(/\n}\s*$/, METHODS + "}\n");
    return c;
  });
