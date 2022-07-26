from django.urls import path

from liveapp.views import AjaxKPISView, KPISView, AjaxMarkersView


urlpatterns = [
	path('kpis/', KPISView.as_view(), name='kpis'),
	path('ajax_markers/', AjaxMarkersView.as_view(), name='ajax_markers'),
	path('ajax_kpis/', AjaxKPISView.as_view(), name='ajax_kpis'),
]