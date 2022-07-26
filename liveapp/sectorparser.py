import math
from django.db.models import Q, Prefetch
from functools import reduce

from geopy import Point
from geopy.distance import geodesic

from liveapp.models import Node, Kpi
from liveapp.serializers import NodeSectorSerializer



###################################################################################################################
###################################################################################################################
#                                            SiteSectors (main class)                                             #
###################################################################################################################
###################################################################################################################

class SiteSectors():

	def __init__(self,nodes_list):
		self.nodes_list = nodes_list

	def get_distances_list(self,div):	#Calculate a list of distances according to the number of nodes
										#within the limits of the map, the lenght of the list varies according to the bands per sector

		def get_list(min_distance):
			N = min_distance/2
			base_increment = 1/(len(self.bands_names)+1)
			dist_list = [ (i+2)*base_increment*N/div for i in range(len(self.bands_names)) ]
			return dist_list

		points = [({'lat':node['latitude'], 'lng':node['longitude']}) for node in self.kpis_values if node['coverage'] == 'outdoor']
		points_indoor = [({'lat':node['latitude'], 'lng':node['longitude']}) for node in self.kpis_values if node['coverage'] == 'indoor']

		if (len(points_indoor) == 0 and len(points) == 1) or (len(points_indoor) == 1 and len(points) == 0):
			dist_list = get_list(1)
			return dist_list
		elif len(points_indoor) > 1 and len(points) == 0:
			points_to_evaluate = points_indoor
		elif len(points_indoor) > 0 and len(points) == 1:
			points_to_evaluate = points + points_indoor
		elif len(points) > 1:
			points_to_evaluate = points

		min_distance = 4000000000

		for i in range(len(points_to_evaluate)):

			p1 = (points_to_evaluate[i]['lat'], points_to_evaluate[i]['lng'])
			
			for j in range(len(points_to_evaluate)):
				p2 = (points_to_evaluate[j]['lat'], points_to_evaluate[j]['lng'])
				if p1 != p2:
					dist = int(geodesic(p1, p2).meters)
					if dist < min_distance and dist > 1:
						min_distance = dist

		min_distance = min_distance/1000
		dist_list = get_list(min_distance)

		return dist_list



	def get_coordinates_base(self,num,coverage,origen,azm): 
		  													#Get the coordinates of each point of the band of each sector
															#to create the corresponding polygon in google maps
		def get_point(x,y,dist,azm,ang_indx):
			ang_offsets = [-30, 65, 75, 85, 95, 105, 115]
			bearing = azm + ang_offsets[ang_indx]
			start = Point(y,x)
			d = geodesic(kilometers = dist)
			T = d.destination(point=start, bearing=bearing)
			return T

		bands_points = {}

		for indx in range(num):
			if coverage=='indoor':
				dist = [self.dist_list[i]/2 for i in range(len(self.dist_list))]
			else:
				dist = self.dist_list
			dist1 = dist[indx]
			X0 = origen['lng']
			Y0 = origen['lat']
			dist2 = 2 * (dist1*math.sin(math.radians(5)))
			points = []

			for i in range(7):
				if i == 0:
					points.extend([get_point(X0,Y0,dist1,azm,i)])
				else:
					points.extend([get_point(points[i-1].longitude,points[i-1].latitude,dist2,azm,i)])

			bands_points[indx] = [points[0], points[1], points[2], points[3], points[4], points[5], points[6]]

		return bands_points



	def mount_points(self,point_0,band_points):
		full_coords = {}

		for band_indx, values in band_points.items():

			if band_indx == 0:
				pre_list = [[point_0[0],point_0[1]]]
				middle_list = []
				post_list = [[values[i].latitude, values[i].longitude] for i in range(7)]
			else:
				pre_list = [[band_points[band_indx-1][0].latitude,band_points[band_indx-1][0].longitude]]
				middle_list = [[values[i].latitude, values[i].longitude] for i in range(7)]
				post_list = [[band_points[band_indx-1][i].latitude,band_points[band_indx-1][i].longitude] for i in range(6,0,-1)]
			full_coords[band_indx] = pre_list + middle_list + post_list


		return full_coords


	def mount_points_beta(self,point_0,band_points):
														#Get the structure of the polygon points (coordinates) in a single dictionary
		full_coords = {}

		for band_indx, values in band_points.items():

			if band_indx == 0:
				pre_list = [{'lat':point_0[0], 'lng':point_0[1]}]
				middle_list = []
				post_list = [{'lat':values[i].latitude, 'lng':values[i].longitude} for i in range(7)]
			else:
				pre_list = [{'lat':band_points[band_indx-1][0].latitude,'lng':band_points[band_indx-1][0].longitude}]
				middle_list = [{'lat':values[i].latitude, 'lng':values[i].longitude} for i in range(7)]
				post_list = [{'lat':band_points[band_indx-1][i].latitude,'lng':band_points[band_indx-1][i].longitude} for i in range(6,0,-1)]
			full_coords[band_indx] = pre_list + middle_list + post_list


		return full_coords

	def draw_data(self):	# get the points (coordiantes) to draw polygons of all the nodes within the limits of the map
		self.bands_names = list(set([cell['band_id'] for node in self.kpis_values for sector in node['sectors'] for cell in sector['cells']]))
		self.bands_names.sort()

		divisor = 2		

		self.data = {}	
		self.dist_list = self.get_distances_list(div=divisor)	
		for node in self.kpis_values:
			draw_data = {}
			origen = {'lat':node['latitude'], 'lng':node['longitude']}

			for sector in node['sectors']:

				BANDAS = {}
				point_0 = [origen['lat'],origen['lng']]
				band_points = self.get_coordinates_base(len(self.bands_names),node['coverage'],origen,sector['azimuth'])
				full_coords = self.mount_points_beta(point_0,band_points)

				for indx, band_name in enumerate(self.bands_names):
					for cell in sector['cells']:
						if cell['band_id'] == band_name:
							try:
								BANDAS[band_name] = {'kpiValue':cell['kpis'][0]['value'],'color':cell['kpis'][0]['color'],'coordinates':full_coords[indx]}						
							except Exception as e:
								BANDAS[band_name] = {'kpiValue':-1,'color':'#e5e5e5','coordinates':full_coords[indx]}						
				draw_data[sector['sector']] = BANDAS

			self.data[node['code']] = draw_data





###################################################################################################################
###################################################################################################################
#                                            SiteSectorsKPIS (subclass de SiteSectors)                            #
###################################################################################################################
###################################################################################################################


class SiteSectorsKPIS(SiteSectors):
	def __init__(self,nodes_list,kpi,date_beta):
		SiteSectors.__init__(self,nodes_list)
		self.kpi = kpi
		self.date_beta = date_beta

	def get_values(self):  # Get the kpis of the corresponding sites and date

		try:
			nodes = Node.objects.prefetch_related(
							Prefetch(
						'sectors__cells__kpis',
						queryset=Kpi.objects.filter(name=self.kpi).filter(date=self.date_beta)
					)
			).filter(reduce(lambda x, y: x | y, [Q(code=node) for node in self.nodes_list]))
			
			serializer = NodeSectorSerializer(nodes, many=True)	
			self.kpis_values = serializer.data
						
		except Exception as e:
			print(e)



