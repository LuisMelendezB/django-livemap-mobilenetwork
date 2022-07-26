// Customize options here

// Ajax request urls
const ajaxUrls = {
    nodes: "/livemap/ajax_markers/",
    kpis: "/livemap/ajax_kpis/"
};

// Initial map location and zoom
const initialMap = {
    lat: "29.7433056",
    lng: "-95.2331944",
    zoom: 13
};

// Polygons draw options
const polygonsProperties = {
    strokeColor: '#000000',
    strokeOpacity: 1,
    strokeWeight: 1,
    fillOpacity: 0.8
};

// Node markers options
const nodeMarkerProperties = {
    label:{
        fontWeight: "bold",
        color:'#000000',
        strokeColor: '#000000',
        strokeWeight: 10
        },
    icon: {
        url: "/static/liveapp/img/nodeMarker.svg",
        scaledSizeX: 20,
        scaledSizeY: 20,
        labelOriginX: 10,
        labelOriginY: -10,
        fontSize: "8px"
        }    
};

// Clustered Nodes options
const clustersProperties = {
    imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
    zoomOnClick: true,
    gridSize: 110
}

// Text format of the polygons click event
function getClickText(sector, band, value) {
    clickText = '<small>S:' + sector + ' - B:' + band + ': </small>' + '<font color="black"><b>' + value + '</b></font>';
    return clickText
};

// -------------------------------------------------------------------------------------------------------------------------

var csrf_token = document.getElementsByName("csrfmiddlewaretoken")[0];
var markers_array = [];

const nodes = {
    names: [],
    codes: []
}

const rangeDates = {
    min:null,
    max:null,
    selected:null
}

var kpisSpecs = null;
var map;
var markerCluster = null;
var clustered_markers = null;
var promiseNodes = getJsonNodes();
var ajaxreq = null;
var auto = false;
var infoWindow = null;
var ignored_markers = []; //check with more nodes
var kpi = "availability";	
var prevKpi = kpi;
var polygons_base = [];
var arrayKpis = [];

function getJsonNodes() { 

    call_blockui();
    return new Promise(function(resolve, reject) {
    
        $.ajax({
                    type:"POST",
                    url:ajaxUrls.nodes,
                    contentType:"application/json; charset=utf-8",
                    data: JSON.stringify({'get':'nodes'}),
                    dataType: "json",            
                    headers: {
                       'X-CSRFToken': csrf_token.value
                   },
                     success:function (data) {
                      receivedJsonNodes = JSON.parse(data);
                      rangeDates.max = receivedJsonNodes.slice(-1)[0].maxDate;
                      rangeDates.min = receivedJsonNodes.slice(-1)[0].minDate;
                      rangeDates.selected = rangeDates.max
                      kpisSpecs = receivedJsonNodes.slice(-1)[0].kpisSpecs;
                      receivedJsonNodes = receivedJsonNodes.slice(0, -1);
                      if (receivedJsonNodes.status == "FAILED") {
                          window.alert(receivedJsonNodes.reason);	
                      }
                      else {
                        resolve(receivedJsonNodes);
                      }
                    },
                    failure:function (errMsg) {
                      console.log('not completed ajax');
                      receivedJsonNodes = null;
                      reject("promise fail")
                    },
                    complete: function(data) {
                        $.unblockUI(); 
                        console.log("completed ajax markers");
                        init_inputs();
                        resolve("promise ok")		            	
                    }
                });
    })
};

promiseNodes.then(function(result) {
    
    
        $(document).ready(function() {

            addMarkers(receivedJsonNodes);
            markerCluster = new MarkerClusterer(map, markers_array,
                {imagePath: clustersProperties.imagePath,
                zoomOnClick: clustersProperties.zoomOnClick,
                gridSize: clustersProperties.gridSize
                });
            firstLoad = map_first_load();
            firstLoad.then(function(result2){
                //createLegends();
                createLegendsDOMSorted();
                createLegendsDOM();
                add_legends('mapLegend_auto','BOTTOM_CENTER');
                add_legends('mapLegend_availability','LEFT_CENTER');
                

            })
            init_datepicker();
        });
},
	function(err) {
		console.log(err)
});

function addMarkers(receivedJsonNodes) { // Genera un array de marcadores a partir de los sitios obtenidos mediante el request ajax
	for (node in receivedJsonNodes){				
		nodes.names.push(receivedJsonNodes[node].name);
		nodes.codes.push(receivedJsonNodes[node].code);		
		var mkLatLng = {lat: parseFloat(receivedJsonNodes[node].latitude), lng: parseFloat(receivedJsonNodes[node].longitude)};
		var marker_unit = new google.maps.Marker({
			position: mkLatLng,
			title:receivedJsonNodes[node].code,   
			label:{
				text:receivedJsonNodes[node].name,
				fontWeight: nodeMarkerProperties.label.fontWeight,
				color:nodeMarkerProperties.label.color,
				strokeColor: nodeMarkerProperties.label.strokeColor,
				strokeWeight: nodeMarkerProperties.label.strokeWeight
				},
			icon: {
				url: nodeMarkerProperties.icon.url,
				scaledSize: new google.maps.Size(nodeMarkerProperties.icon.scaledSizeX, nodeMarkerProperties.icon.scaledSizeY) ,
				labelOrigin: new google.maps.Point(nodeMarkerProperties.icon.labelOriginX, nodeMarkerProperties.icon.labelOriginY),
				fontSize: nodeMarkerProperties.icon.fontSize
                }
			});   
		markers_array.push(marker_unit);
		};
};

function map_first_load() {

    return new Promise (function(resolve, reject){
        infoWindow = new google.maps.InfoWindow;
        google.maps.event.addListener(map, 'idle', function() {
    
            if (ajaxreq != null) {
                ajaxreq.abort();
    
                map.setOptions({
                    gestureHandling: 'none',
                    zoomControl: false
                });
            }
    
            showVisibleMarkers();
            var nodesToSend = get_nodesToSend();
            jsonToSend = {'nodesToSend':nodesToSend}
    
            if (auto == true) {
                polygons_base = delete_polygons(polygons_base);
                send_markers(jsonToSend);
                }
            else {
                map.setOptions({
                gestureHandling: 'greedy',
                zoomControl: true
                });
                }
        });
        if (infoWindow != null){
            resolve("map loaded")
            console.log(infoWindow)
        }
        else {
            reject('map not loaded')
        }



    })


};

function showVisibleMarkers() { // Get all the nodes inside map bounds
    let clusteredNodes = [];
    let markers_visible = [];
    
    for (let i = 0; i <  markers_array.length; i++) {
            
        if (map.getBounds().contains(markers_array[i].getPosition()) === true) {
            markers_array[i].setMap(null);
            markers_array[i].setMap(map);

            clusteredNodes.push(markers_array[i]);            

            if (markers_visible.includes(markers_array[i]) === false) {
              markers_visible.push(markers_array[i]);
            }
        }        
        else {
            if (markers_visible.includes(markers_array[i]) === true) {
              markers_visible.pop(markers_array[i]);
            }          
            markers_array[i].setMap(null);
        }
    }
    if (markerCluster) {
        markerCluster.clearMarkers();
        markerCluster.addMarkers(clusteredNodes); 
        clustered_markers = markerCluster.getMarkers()
        };  
};

function get_nodesToSend() { // Get all the nodes inside map bounds except clustered nodes
	var markers_isolated = [];
	var clusters = markerCluster.getClusters();

	for (var i=0;i<clusters.length;i++) {

		if (clusters[i] != null && clusters[i].markers_ != null) {
			if (clusters[i].markers_.length == 1) {
				markers_isolated.push(clusters[i].markers_[0].title);
				}
			}
	}
	var titles = "";
	var nodesToSend = [];

	for (var i = 0; i<markers_isolated.length;i++) {
		titles = titles + "," + markers_isolated[i];
		if(!ignored_markers.includes(markers_isolated[i])) {
			nodesToSend.push(markers_isolated[i])
			}		
		}
	return nodesToSend;
};

function send_markers(jsonToSend){

    jsonToSend.kpi = kpi;
    jsonToSend.date = rangeDates.selected;

	ajaxreq =
        $.ajax({
            type:"POST",
            url:ajaxUrls.kpis,
            contentType:"application/json; charset=utf-8",
            data: JSON.stringify(jsonToSend),
            dataType: "json",            
            headers: {
                'X-CSRFToken': csrf_token.value
                },
            success:function (data) {
                var jsonReceived = JSON.parse(data);
                map.setOptions({
                    gestureHandling: 'greedy',
                    zoomControl: true
                    });
                if (jsonReceived.no_data == null) {
                    polygons_base = createPolygons(jsonReceived);
                }
            },
            failure:function (errMsg) {
                console.log('not completed sendmarkers');
                map.setOptions({
                    gestureHandling: 'greedy',
                    zoomControl: true
                    });              
                }           
        });
};

function createPolygons(jsonReceived) {
	let polygons = [];

	function addClickEventOnPolygon(polygon) {
	  google.maps.event.addListener(polygon, 'click', function (event) {
	    let clickText = '<div>'+polygon.clickText+'</div>'
	    infoWindow.setContent(clickText);
	    infoWindow.setPosition(event.latLng);
	    infoWindow.open(map);
	  });  
	};

    function polygonize(coordinates,color) {

        let polygon = new google.maps.Polygon({
            paths: coordinates,
            fillColor: color,
            strokeColor: polygonsProperties.strokeColor,
            strokeOpacity: polygonsProperties.strokeOpacity,
            strokeWeight: polygonsProperties.strokeWeight,
            fillOpacity: polygonsProperties.fillOpacity
        });
        return polygon;
    };

    for (let node in jsonReceived) {
        for (let sector in jsonReceived[node]) {
            for (let band in jsonReceived[node][sector]){
                let kpiValue = jsonReceived[node][sector][band].kpiValue;
                let polygon = polygonize(jsonReceived[node][sector][band].coordinates ,jsonReceived[node][sector][band].color);            		
                polygon.clickText = getClickText(sector, band, kpiValue.toString())
                polygons.push(polygon);
            };
        };
    };

    for (let i = 0; i < polygons.length; i++) {
        polygons[i].setMap(map);
        addClickEventOnPolygon(polygons[i]);
    };
  return polygons
};

function pseudo_idle_map() {

	if (ajaxreq != null) {
	ajaxreq.abort();
	map.setOptions({
		gestureHandling: 'none',
		zoomControl: false
		});
	}
	showVisibleMarkers();
	var nodesToSend = get_nodesToSend();
	jsonToSend = {'nodesToSend':nodesToSend}
	polygons_base = delete_polygons(polygons_base);
    send_markers(jsonToSend);
	
};

function myMap() { // Genera el mapa
  
	var mapCanvas = document.getElementById("map");
	var infoWindow = new google.maps.InfoWindow;
	var mapOptions = {
		center: new google.maps.LatLng(initialMap.lat, initialMap.lng),
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		gestureHandling: 'greedy',
		zoom: initialMap.zoom
		};

	map = new google.maps.Map(mapCanvas, mapOptions);

	var measureTool = new MeasureTool(map, {
		showSegmentLength: true,
		tooltip: false,
		unit: MeasureTool.UnitTypeId.METRIC // metric or imperial
		});

	google.maps.event.addListener(map, 'click', function(event) {
		
		if($('#add_custom_marker').is(":checked"))
			{
				placeMarker(event.latLng);	
			}		
	});


	var drawingManager = new google.maps.drawing.DrawingManager({
		drawingMode: google.maps.drawing.OverlayType.MARKER,
		drawingControl: true,
		drawingControlOptions: {
		position: google.maps.ControlPosition.TOP_CENTER,
		drawingModes: ['marker', 'polygon', 'polyline', 'rectangle']
		},
		circleOptions: {
			fillColor: '#ffff00',
			fillOpacity: 0.8,
			strokeWeight: 5,
			clickable: false,
			editable: true,
			zIndex: 1
			}
	});
	drawingManager.setMap(map);
	drawingManager.setDrawingMode(null);
 
	google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
		drawingManager.setDrawingMode(null);

		event.overlay.addListener('click', function() {
			event.overlay.setMap(null);
			$("#dialog").dialog("close");
			});			

		event.overlay.addListener('rightclick', function() {
			add_dialog(event);
			
			});	

		});
};

function delete_polygons(polygons) {
	for (var i = 0;i<polygons.length;i++) {
		polygons[i].setMap(null);
		}
	polygons = [];
	return polygons;
};


function placeMarker(location) {
    var marker = new google.maps.Marker({
        position: location, 
        map: map
    });

	marker.addListener('click', function() {
		marker.setMap(null);
	});
};

function call_blockui() {
	$.blockUI({ 
		message: $('#displayBox'), 
		css: {
		border:     'none',
		backgroundColor:'transparent',
		textAlign:  'center',
			} 
		}); 
	setTimeout($.unblockUI, 30000);		
};

function init_inputs(){ // Genera la informaciÃ³n de los sitios con que se llenarÃ¡n los autocompletes (sitio y nombre)
    $( "#input_nombre" ).autocomplete({
      source: nodes.names,
      select: function( event, ui ) {
        $( "#input_nombre" ).val( ui.item.label );
        var name_to_center = document.getElementById("input_nombre").value;
		center_to_name(name_to_center);
        return false;
      }
    });

    $( "#input_propiedad" ).autocomplete({
      source: nodes.codes,
      select: function( event, ui ) {
        $( "#input_propiedad" ).val( ui.item.label );
        var site_to_center = document.getElementById("input_propiedad").value;
		center_to_site(site_to_center);
        return false;
      		}      
    	});
};

function center_to_site(site_to_center) { // Obtiene el nombre del sitio 

	var arrayLength = markers_array.length;
	for (var i = 0; i < arrayLength; i++) {
		if (markers_array[i].title == site_to_center){
			var mkLatLng = markers_array[i].position;
        	map.setCenter(mkLatLng);
        	map.setZoom(16)				
			document.getElementById("input_nombre").value = markers_array[i].label.text;
			break;
			};
		};
};

function center_to_name(name_to_center) { // Obtiene el el sitio a partir de un nombre 

	var arrayLength = markers_array.length;
	for (var i = 0; i < arrayLength; i++) {
		if (markers_array[i].label.text == name_to_center){
			var mkLatLng = markers_array[i].position;
        	map.setCenter(mkLatLng);
        	map.setZoom(16)			
			document.getElementById("input_propiedad").value = markers_array[i].title;
			break;
			};
		};
};

function add_legends(id_legend,position) {

	var legend_to_add = document.getElementById(id_legend);
	map.controls[google.maps.ControlPosition[position]].push(legend_to_add);
	legend_to_add.style.display='inherit';

};

function remove_legends(id_legend,position) {
	var legend_to_remove = document.getElementById(id_legend);
	legend_to_remove.style.display='none';
	map.controls[google.maps.ControlPosition[position]].pop(legend_to_remove);
	$("#kpi_legends").append(legend_to_remove);

};


function createLegendsDOMSorted() {
    var body = document.getElementsByTagName("body")[0];

    for (kpiName in kpisSpecs) {

        var divKpiLegend = document.createElement("div");
        var table = document.createElement("table");
        divKpiLegend.classList.add('kpi-legends');
        table.classList.add('table-legends');
        divKpiLegend.setAttribute("id", 'mapLegend_'+kpiName);

        var tblBody = document.createElement("tbody");

        var rowTitle = document.createElement("tr");
        var cellTitle = document.createElement("td");
        cellTitle.style.backgroundColor = "gray";
        var textTitle = document.createTextNode(kpiName);

        cellTitle.appendChild(textTitle);
        rowTitle.appendChild(cellTitle);
        tblBody.appendChild(rowTitle);

        for (pairData in kpisSpecs[kpiName]) {
            var rowB = document.createElement("tr");
            var cellB = document.createElement("td");
            cellB.classList.add('td-legends');
            var textB = document.createTextNode(kpisSpecs[kpiName][pairData][0]);
            cellB.style.backgroundColor = kpisSpecs[kpiName][pairData][1];

            cellB.appendChild(textB);
            rowB.appendChild(cellB);
            tblBody.appendChild(rowB);
        }

        var rowNull = document.createElement("tr");
        var cellNull = document.createElement("td");
        cellNull.classList.add('td-legends');
        
        var textNull = document.createTextNode("-1");

        cellNull.appendChild(textNull);
        rowNull.appendChild(cellNull);
        tblBody.appendChild(rowNull);

        table.appendChild(tblBody)
        divKpiLegend.appendChild(table);
        body.appendChild(divKpiLegend);

    }
}


function createLegendsDOM() {

    var body = document.getElementsByTagName("body")[0];

    for (kpiSpec in kpisSpecs) {
      

        var divKpiLegend = document.createElement("div");
        var table = document.createElement("table");
        divKpiLegend.classList.add('kpi-legends');
        table.classList.add('table-legends');
        divKpiLegend.setAttribute("id", 'mapLegend_'+kpiSpec);

        var tblBody = document.createElement("tbody");

        var rowTitle = document.createElement("tr");
        var cellTitle = document.createElement("td");
        cellTitle.style.backgroundColor = "gray";
        var textTitle = document.createTextNode(kpiSpec);

        cellTitle.appendChild(textTitle);
        rowTitle.appendChild(cellTitle);
        tblBody.appendChild(rowTitle);


        for (range in kpisSpecs[kpiSpec]) {
            var rowB = document.createElement("tr");
            var cellB = document.createElement("td");
            cellB.classList.add('td-legends');
            var textB = document.createTextNode(range);
            cellB.style.backgroundColor = kpisSpecs[kpiSpec][range];

            cellB.appendChild(textB);
            rowB.appendChild(cellB);
            tblBody.appendChild(rowB);
        }

        var rowNull = document.createElement("tr");
        var cellNull = document.createElement("td");
        cellNull.classList.add('td-legends');
        
        var textNull = document.createTextNode("-1");

        cellNull.appendChild(textNull);
        rowNull.appendChild(cellNull);
        tblBody.appendChild(rowNull);

        table.appendChild(tblBody)
        divKpiLegend.appendChild(table);
        body.appendChild(divKpiLegend);
    }


}


$(document).ready(function() { 


    document.getElementById("autoCheck").addEventListener("change" ,function () {      
      if (document.getElementById("autoCheck").checked == true) {        
        document.getElementById("div-check").className = "custom-control custom-switch div-plot";
        auto = true;
        pseudo_idle_map();
      }
      else {
        auto = false
        document.getElementById("div-check").className = "custom-control custom-switch div-plot-cn";
      }
    });

});

// ----------------------------------------------------------------------->

document.getElementById("kpi").addEventListener("change" ,function () { 
    prevKpi = kpi;     
    kpi = $("#kpi option:selected").val();

    if(document.getElementById("autoCheck").checked == true) {
      pseudo_idle_map();          
    }

    remove_legends("mapLegend_" + prevKpi,'LEFT_CENTER');
    add_legends("mapLegend_" + kpi,'LEFT_CENTER');
});


function init_datepicker() {

    $( "#datepicker-s" ).datepicker({
        firstDay:1,
        showWeek: true,
        showOtherMonths: true,
        dateFormat: 'yy-mm-dd',
        onSelect: function() { 
            rangeDates.selected = $("#datepicker-s").val()
            if(document.getElementById("autoCheck").checked == true) {
            pseudo_idle_map();          
            }
        }    
    });
    $( "#datepicker-s" ).datepicker('setDate', rangeDates.selected);
};

