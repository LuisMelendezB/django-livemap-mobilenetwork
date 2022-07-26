from django.contrib import admin

from liveapp.models import Node, Cell, Kpi, Sector

# Register your models here.
@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    ordering = ('code',)
    search_fields = ['code']

@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    ordering = ('name',)
    search_fields = ['node__code']

@admin.register(Cell)
class CellAdmin(admin.ModelAdmin):
    ordering = ('name',)
    search_fields = ['sector__node__code']

@admin.register(Kpi)
class KpiAdmin(admin.ModelAdmin):
    ordering = ('name',)
    search_fields = ['cell__sector__node__code']