from liveapp.models import Node, Sector, Cell, Kpi
from rest_framework import serializers

KPI_COLORS={"availability":{
                            (100,200):'#FF00FF',
                            (99.9,100):'#BB00FF',
                            (99.8,99.9):'#7800FF',
                            (99.7,99.8):'#3500FF',
                            (99.6,99.7):'#000DFF',
                            (99.5,99.6):'#0050FF',
                            (99.4,99.5):'#0093FF',
                            (99.3,99.4):'#00D6FF',
                            (99.2,99.3):'#00FFE4',
                            (99.1,99.2):'#00FFA1',
                            (99,99.1):'#00FF5D',
                            (98,99):'#00FF1A',
                            (97,98):'#28FF00',
                            (96,97):'#6BFF00',
                            (95,96):'#AEFF00',
                            (94,95):'#F1FF00',
                            (93,94):'#FFC900',
                            (92,93):'#FF8600',
                            (91,92):'#FF4300',
                            (90,91):'#FF0000',
                            (85,90):'#D60000',
                            (80,85):'#AD0000',
                            (75,80):'#840000',
                            (70,75):'#5B0000',
                            (65,70):'#330000',
                            (0,65):'#000000'
                            },
            "prb used dl": {
                            (0,2):'#FF00FF',
                            (2,4):'#BB00FF',
                            (4,8):'#7800FF',
                            (8,12):'#3500FF',
                            (12,16):'#000DFF',
                            (16,20):'#0050FF',
                            (20,24):'#0093FF',
                            (24,28):'#00D6FF',
                            (28,32):'#00FFE4',
                            (32,36):'#00FFA1',
                            (36,40):'#00FF5D',
                            (40,44):'#00FF1A',
                            (44,48):'#28FF00',
                            (48,52):'#6BFF00',
                            (52,56):'#AEFF00',
                            (56,60):'#F1FF00',
                            (60,64):'#FFC900',
                            (64,68):'#FF8600',
                            (68,72):'#FF4300',
                            (72,76):'#FF0000',
                            (76,80):'#D60000',
                            (80,84):'#AD0000',
                            (84,88):'#840000',
                            (88,92):'#5B0000',
                            (92,96):'#330000',
                            (96,100):'#000000'
                            },
            
            "dl throughput": {
                            (50000,1000000):'#FF00FF',
                            (45000,50000):'#BB00FF',
                            (40000,45000):'#7800FF',
                            (35000,40000):'#3500FF',
                            (30000,35000):'#000DFF',
                            (25000,30000):'#0050FF',
                            (20000,25000):'#0093FF',
                            (18000,20000):'#00D6FF',
                            (16000,18000):'#00FFE4',
                            (14000,16000):'#00FFA1',
                            (12000,14000):'#00FF5D',
                            (10000,12000):'#00FF1A',
                            (9000,10000):'#28FF00',
                            (8000,9000):'#6BFF00',
                            (7000,8000):'#AEFF00',
                            (6000,7000):'#F1FF00',
                            (5000,6000):'#FFC900',
                            (4500,5000):'#FF8600',
                            (4000,4500):'#FF4300',
                            (3500,4000):'#FF0000',
                            (3000,3500):'#D60000',
                            (2500,3000):'#AD0000',
                            (2000,2500):'#840000',
                            (1500,2000):'#5B0000',
                            (1000,1500):'#330000',
                            (0,1000):'#000000'                
                            }
            }


class NodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = ['code', 'name', 'latitude', 'longitude']

class KpiSerializer(serializers.ModelSerializer):

    color = serializers.SerializerMethodField()
    class Meta:
        model = Kpi
        fields = ['date', 'value','name', 'color']
    
    def get_color(self, obj):

        for (k1, k2) in KPI_COLORS[obj.name]:
            if (min(k1,k2) <= obj.value < max(k1,k2)):
                return KPI_COLORS[obj.name][(k1, k2)]
    
class CellKpiSerializer(serializers.ModelSerializer):

    kpis = KpiSerializer(many=True, read_only=True)

    class Meta:
        model = Cell
        fields = ['name', 'band_id','kpis']


class SectorCellSerializer(serializers.ModelSerializer):

    cells = CellKpiSerializer(many=True, read_only=True)

    class Meta:
        model = Sector
        fields = ['sector','azimuth','cells']


class NodeSectorSerializer(serializers.ModelSerializer):

    sectors = SectorCellSerializer(many=True, read_only=True)

    class Meta:
        model = Node
        fields = ['code', 'name','coverage' ,'latitude', 'longitude', 'sectors']
    
