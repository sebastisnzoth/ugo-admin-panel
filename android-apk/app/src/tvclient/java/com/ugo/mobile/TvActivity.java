package com.ugo.mobile;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;

/**
 * TV-only entry point. Reuses the UGO Cliente runtime without modifying
 * provider/admin flows or production infrastructure.
 */
public class TvActivity extends MainActivity {
    private static final String TV_CSS =
        "(function(){if(document.getElementById('ugo-tv-style'))return;"
      + "var s=document.createElement('style');s.id='ugo-tv-style';"
      + "s.textContent=':focus-visible{outline:4px solid #40c9ff!important;outline-offset:4px!important}'"
      + "+'html,body{scroll-behavior:smooth!important}';document.head.appendChild(s);})();";

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
        super.onCreate(state);
        if (webView != null) {
            webView.getSettings().setUseWideViewPort(true);
            webView.getSettings().setLoadWithOverviewMode(true);
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();
            webView.evaluateJavascript(TV_CSS, null);
            webView.setWebViewClient(new android.webkit.WebViewClient() {
                @Override public void onPageFinished(WebView view, String url) {
                    view.evaluateJavascript(TV_CSS, null);
                }
            });
        }
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
