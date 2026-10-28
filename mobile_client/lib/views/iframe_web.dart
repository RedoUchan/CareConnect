import 'package:flutter/material.dart';
import 'dart:ui_web' as ui_web;
import 'dart:html' as html;

Widget createIframe(String url) {
  // Đăng ký thẻ iframe với định danh duy nhất dựa theo hash URL
  final String viewId = 'iframe-dashboard-${url.hashCode}';
  
  ui_web.platformViewRegistry.registerViewFactory(
    viewId,
    (int viewId) => html.IFrameElement()
      ..src = url
      ..style.border = 'none'
      ..style.width = '100%'
      ..style.height = '100%',
  );
  
  return HtmlElementView(viewType: viewId);
}
