from django.shortcuts import render
from django.views.generic import TemplateView
from django.http import JsonResponse
import json

from liveapp.serializers import NodeSerializer, KPI_COLORS
from liveapp.models import Node, Kpi
from liveapp.sectorparser import SiteSectorsKPIS

class KPISView(TemplateView):
	template_name = 'liveapp/livemap.html'
	
	def get(self, request):
		try:
			max_date = Kpi.objects.latest('date').date
			return render(request, self.template_name, {'date':max_date, 'kpi':KPI_COLORS})

		except Exception as e:
			print(e)

class AjaxKPISView(TemplateView):

	def post(self,request):
		
		try:
			data = request.body
			data = data.decode('utf-8')
			data = json.loads(data)
			nodes = []
			kpi = data['kpi']
			date_beta = data['date']
			for node in data['nodesToSend']:			
				nodes.extend([node])

			if len(nodes) != 0:
				Polygons = SiteSectorsKPIS(nodes_list=nodes,kpi=kpi,date_beta=date_beta)	
				Polygons.get_values()	
				Polygons.draw_data()		
				json_draw = json.dumps(Polygons.data, indent=4)
			else:
				json_draw = json.dumps({'no_data':'no_data'})
			
			return JsonResponse(json_draw, safe=False)
		except Exception as e:
			print(e)


class AjaxMarkersView(TemplateView):

	def post(self, request):

		def get_kpis_specs():
			DESCENDING_KPIS = ['availability', 'dl throughput']
			ASCENDING_KPIS = ['prb used dl']

			kpis_to_json = {}

			for kpi, values in KPI_COLORS.items():
				kpi_specs = []
				for range, color in values.items():
					if kpi in DESCENDING_KPIS:
						kpi_specs.append([range[0],color])
					elif kpi in ASCENDING_KPIS:
						kpi_specs.append([range[1],color])
				kpis_to_json[kpi] = kpi_specs
			return kpis_to_json

		try:
			data = request.body
			data = data.decode('utf-8')
			data = json.loads(data)
			if data['get'] == 'nodes':
				nodes = Node.objects.all()
				serializer = NodeSerializer(nodes, many=True)
				max_date = Kpi.objects.latest('date').date
				min_date = Kpi.objects.earliest('date').date
				misc_info = {'minDate':min_date.strftime('%Y-%m-%d'), 'maxDate':max_date.strftime('%Y-%m-%d'), 'kpisSpecs':get_kpis_specs()}
				json_draw = json.dumps(serializer.data+[misc_info])
			else:
				json_draw = json.dumps({'status':'FAILED','reason':'Ajax request error.'})

		except Exception as e:
			print(e)

			json_draw = json.dumps({'status':'FAILED','reason':'Ajax request error.'})

		return JsonResponse(json_draw, safe=False)




