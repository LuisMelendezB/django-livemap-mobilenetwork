# django-livemap-mobilenetwork

Demo:
https://luismelendezb.pythonanywhere.com/livemap/kpis/


-Django project to draw polygons into google maps to show mobile network KPIs dynamically.

- The map starts with the nodes shown as google maps markers, to show the kpi of the selected date it is necessary to activate the "draw cells" switch, when moving over the map the kpi of each cell available in each node will be dynamically shown. Each stripe corresponds to a cell.

-Nodes and cells are clustered depending on the current zoom.

-To add a kpi, it is necessary to modify the KPI_COLORS dictionary inside the liveapp.serializers file, adding the name of the kpi, the range and the color in hex format that is required to be displayed from the range.

