from django.db import models

class Node(models.Model):
    code = models.CharField(max_length=20, null=False, blank=False, primary_key=True)
    name = models.CharField(max_length=500, null=False, blank=False)
    latitude = models.FloatField(null=False, blank=False)
    longitude = models.FloatField(null=False, blank=False)
    coverage = models.CharField(max_length=10, null=False, blank=False, default='outdoor')
    state = models.CharField(max_length=20, null=True, blank=True)
    city = models.CharField(max_length=20, null=True, blank=True)    

    def __str__(self):
        return self.code


class Sector(models.Model):
    node = models.ForeignKey(Node, related_name='sectors',on_delete=models.CASCADE)
    name = models.CharField(max_length=20, null=False, blank=False, primary_key=True)
    sector = models.IntegerField(null=False, blank=False)
    azimuth = models.FloatField(null=False, blank=False)


    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['node', 'sector'], name='unique_node_sector'
            )
        ]

    def __str__(self):
        return f'{self.node} - {self.sector}'

class Cell(models.Model):
    sector = models.ForeignKey(Sector, related_name='cells',on_delete=models.CASCADE)
    name = models.CharField(max_length=20, null=False, blank=False, primary_key=True)
    band_id = models.IntegerField(null=False, blank=False)
    band_name = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return self.name

class Kpi(models.Model):
    cell = models.ForeignKey(Cell, related_name='kpis',on_delete=models.CASCADE)
    name = models.CharField(max_length=20, null=False, blank=False)
    date = models.DateField(null=False, blank=False)
    value = models.FloatField(null=False, blank=False)


    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['cell', 'name', 'date'], name='unique_cell_name_date'
            )
        ]

    def __str__(self):
        return f'{self.name} - {self.cell} {self.date}'