package com.ugo.mobile;

import android.os.Bundle;
import android.content.pm.ActivityInfo;
import android.view.WindowManager;
import android.view.View;
import android.view.KeyEvent;
import android.webkit.WebView;

/**
 * TV-only entry point. Reuses the UGO Cliente runtime without modifying
 * provider/admin flows or production infrastructure.
 */
public class TvActivity extends MainActivity {
    private static final String TV_CSS =
        "(function(){var s=document.getElementById('ugo-tv-style');if(!s){s=document.createElement('style');s.id='ugo-tv-style';document.head.appendChild(s);}s.textContent=\"html,body,#root{width:100%!important;max-width:none!important;min-height:100%!important;margin:0!important}\\n.mvp-auth-page.role-client{box-sizing:border-box!important;width:100%!important;min-height:100dvh!important;padding:14px!important;overflow-x:hidden!important;overflow-y:auto!important}\\n.mvp-auth-page.role-client .mvp-auth-shell{box-sizing:border-box!important;width:min(1480px,100%)!important;max-width:100%!important;min-height:calc(100dvh - 28px)!important;height:auto!important;margin:0 auto!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;border-radius:20px!important;overflow:hidden!important}\\n.mvp-auth-page.role-client .mvp-auth-intro,.mvp-auth-page.role-client .mvp-auth-card{min-width:0!important;max-width:none!important;padding:clamp(20px,3vw,42px)!important;overflow-wrap:anywhere!important}\\n.mvp-auth-page.role-client .mvp-auth-intro-copy{padding:20px 0!important}\\n.mvp-auth-page.role-client .mvp-auth-intro-copy h2{font-size:clamp(26px,3.5vw,48px)!important;max-width:100%!important}\\n.mvp-auth-page.role-client .mvp-auth-card h1{font-size:clamp(24px,3vw,42px)!important}\\n.mvp-auth-page.role-client .mvp-auth-card :is(input,button,select,textarea){min-height:48px}\\n:is(a,button,input,select,textarea,[tabindex],[role=button]):focus{outline:4px solid #40c9ff!important;outline-offset:3px!important}\\n@media(max-width:880px){.mvp-auth-page.role-client .mvp-auth-shell{grid-template-columns:minmax(0,1fr)!important}.mvp-auth-page.role-client .mvp-auth-intro{display:none!important}}\";})();";

    private static final String TV_NAV =
        "(function(key){"
      + "var selectors='a[href],button,input,select,textarea,[tabindex]:not([tabindex=\"-1\"]),[role=button]';"
      + "var all=Array.from(document.querySelectorAll(selectors)).filter(function(el){"
      + "var r=el.getBoundingClientRect(),s=getComputedStyle(el);"
      + "return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!el.disabled;});"
      + "var active=document.activeElement;"
      + "if(key===23||key===66){if(active&&active!==document.body){active.click();return;}if(all.length){all[0].focus();all[0].click();}return;}"
      + "if(!all.length)return;"
      + "var current=all.indexOf(active);"
      + "if(current<0){all[0].focus();all[0].scrollIntoView({block:'nearest'});return;}"
      + "var r=active.getBoundingClientRect(),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;"
      + "var best=null,score=Infinity;"
      + "all.forEach(function(el){if(el===active)return;var t=el.getBoundingClientRect();"
      + "var dx=(t.left+t.right)/2-cx,dy=(t.top+t.bottom)/2-cy;"
      + "var main=key===19?-dy:key===20?dy:key===21?-dx:dx;"
      + "var side=(key===19||key===20)?Math.abs(dx):Math.abs(dy);"
      + "if(main<=2)return;var value=main+side*2;"
      + "if(value<score){score=value;best=el;}});"
      + "if(best){best.focus();best.scrollIntoView({block:'nearest',inline:'nearest'});}"
      + "})(";

    @Override public void onCreate(Bundle state) {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        super.onCreate(state);
        if (webView != null) {
            webView.getSettings().setUseWideViewPort(true);
            webView.getSettings().setLoadWithOverviewMode(true);
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();
        }
    }

    @Override protected void onWebPageReady(WebView view) {
        // Keep shared WebViewClient and loader dismissal from MainActivity.
        view.evaluateJavascript(TV_CSS, null);
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && webView != null) {
            int key = event.getKeyCode();
            if (key == KeyEvent.KEYCODE_DPAD_UP || key == KeyEvent.KEYCODE_DPAD_DOWN
                    || key == KeyEvent.KEYCODE_DPAD_LEFT || key == KeyEvent.KEYCODE_DPAD_RIGHT
                    || key == KeyEvent.KEYCODE_DPAD_CENTER || key == KeyEvent.KEYCODE_ENTER) {
                webView.evaluateJavascript(TV_NAV + key + ");", null);
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }
}
