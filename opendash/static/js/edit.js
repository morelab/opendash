

//////////////////////////////// utility functions ///////////////////////////////////////

function findClass(uri) {
	for (var i = 0; i < desc.classes.length; i++) {
		if (desc.classes[i].classURI == uri)
			return i;
	}
	return -1;
};

function findProperty(uri, classID) {
	for (var i = 0; i < desc.classes[classID].properties.length; i++) {
		if (desc.classes[classID].properties[i].uri == uri)
			return i;
	}
	return -1;
};

function getObjectID(event) {
	var source = event.target || event.srcElement;
	var res = source.id.split("-");
	return res[res.length - 1];
};

function updateSelectComponent(componentID, values, property, onChange, addFilter) {
	addFilter = typeof addFilter == 'undefined' ? function f() { return true } : addFilter;

	$("#" + componentID).empty();

	for (var index = 0; index < values.length; index++) {
		if (addFilter(values[index]) == true)
			$("#" + componentID).append(new Option(values[index][property], index));
	}

	$("#" + componentID).change(function() {
		var index = $(this).val();
		onChange(componentID, values[index], index);					
	});	

	onChange(componentID, values[0], 0);
};

//////////////////////////////////////////////////////////////////////////////////////////


var chart = {};
chart.data = {};
chart.lines = {};
chart.classes = {};
connections = {};

var id = 0;

function updateYSubProperty(componentID) {
	var tokens = componentID.split("-");
	var lineID = tokens[tokens.length - 1];

	chart.lines[lineID].yvalues = $('#' + componentID + ' :selected').text();
	chart.lines[lineID].ysubproperty = $('#yvalues-list-' + lineID + ' :selected').text();

	chart.lines[lineID].endpoint = desc.endpoint;
	chart.lines[lineID].graph = desc.graph;

	updateChartLine('chart-div', chart, lineID);
};

function updateYValues(componentID) {
	var tokens = componentID.split("-");
	var lineID = tokens[tokens.length - 1];

	var classURI = $('#main-class-list :selected').text();
	var propertyURI = $('#' + componentID + ' :selected').text();

	var classID = findClass(classURI);
	var propertyID = findProperty(propertyURI, classID);

	$("#y-subproperty-list-" + componentID).remove();
	if (desc.classes[classID].properties[propertyID].type == 'object_type') {
		var snippet = '<select id="y-subproperty-list-' + componentID + '" class="form-control"></select>';

		$("#y-selected-property-" + componentID).append(snippet);

		var subpropertyClassID = findClass(desc.classes[classID].properties[propertyID].datatype);

		updateSelectComponent('y-subproperty-list-' + componentID, desc.classes[subpropertyClassID].properties, 'uri', updateYSubProperty, yValuesFilter);
	} else {
		chart.lines[lineID].yvalues = $('#' + componentID + ' :selected').text();
		chart.lines[lineID].ysubproperty = '';

		updateChartLine('chart-div', chart, lineID);
	}
};

function yValuesObjectFilter(property) {
	return (property.type == 'object_type' || $.inArray(property.datatype, getYValidDataTypes()) != -1);
};

function xValuesObjectFilter(property) {
	return (property.type == 'object_type' || $.inArray(property.datatype, getXValidDataTypes()) != -1);
};

function xValuesFilter(property) {
	return $.inArray(property.datatype, getXValidDataTypes()) != -1;
};

function yValuesFilter(property) {
	return $.inArray(property.datatype, getYValidDataTypes()) != -1;
};

function addLine(desc, id) {
	chart.lines[id]	 = {}

	var snippet = 	'<div id="configuration-' + id + '">' + 
						'<form class="form-horizontal" role="form">' +
							'<div class="form-group">' +
								'<label class="col-sm-2 control-label">Y</label>' +
								'<div id="y-selected-property-yvalues-list-' + id + '" class="col-sm-8">' +
									'<select id="yvalues-list-' + id + '" class="form-control"></select>' +
								'</div>' + 
								'<div class="col-sm-2">' +
									'<button id="remove-conf-button-' + id + '"type="button" class="btn btn-danger">X</button>' +
								'</div>' +
							'</div>' +
						'</form>' +
					'</div>';

	$('#lines-configuration').append(snippet);

	var classID = $("#main-class-list :selected").val();

	updateSelectComponent("yvalues-list-" + id, desc.classes[classID].properties, 'uri', updateYValues, yValuesObjectFilter);

	$("#remove-conf-button-" + id).click(function(event) {
		$('#configuration-' + id).remove();

		var lineID = getObjectID(event);
		delete chart.lines[lineID];

		if (Object.keys(chart.lines).length > 0)
			drawChart('chart-div', chart);
		else
			$("#chart-div").empty();
	});
};

function updateSecondaryYValues(connections, id, clazz) {
	var classID = $("#secondary-class-list :selected").val();

	$("#secondary-yvalues-list-" + id).empty();

	for (var index = 0; index < clazz.properties.length; index++) {
		var property = clazz.properties[index];
		if (property.type == 'object_type' || $.inArray(property.datatype, getYValidDataTypes()) != -1)
			$("#secondary-yvalues-list-" + id).append(new Option(property.uri, classID + ":" + index));
	}
};

function updateConnectionLabel(connections, id, clazz) {
	var res = $("#secondary-yvalues-list-" + id).val().split(":");
	var property = clazz['properties'][res[1]];

	$("#connection-label").text(property.connection);
};

function getValidDataTypes() {
	return $.merge(getXValidDataTypes(), getYValidDataTypes());

};

function getXValidDataTypes() {
	return 	[	'http://www.w3.org/2001/XMLSchema#integer',
				'http://www.w3.org/2001/XMLSchema#decimal',
				'http://www.w3.org/2001/XMLSchema#float',
				'http://www.w3.org/2001/XMLSchema#string'
			];			
};

function getYValidDataTypes() {
	return 	[	'http://www.w3.org/2001/XMLSchema#integer',
				'http://www.w3.org/2001/XMLSchema#decimal',
				'http://www.w3.org/2001/XMLSchema#float',
			];			
};

function removeIncompatibleTypes(classes, getValidDataTypes) {
	compatibleClasses = []
	for (var clazzIndex = 0; clazzIndex < classes.length; clazzIndex++) {
		properties = []

		clazz = classes[clazzIndex];
		for (var propertyIndex = 0; propertyIndex < clazz.properties.length; propertyIndex++) {
			property = clazz.properties[propertyIndex];
			if (property.type == 'object_type' || $.inArray(property.datatype, getValidDataTypes()) != -1)
				properties.push(property);
		}
		if (properties.length > 0)
			compatibleClasses.push({classURI : clazz.classURI, properties: properties})
	}

	return compatibleClasses;
};

function updateMainClass(componentID, selectedObj, descID) {
	chart.mainclass = desc.classes[descID].classURI;

	updateSelectComponent("main-xvalues-list", selectedObj.properties, 'uri', updateXValues, xValuesObjectFilter);
};

function updateXSubProperty() {
	chart.xvalues = $('#subproperty-list :selected').text();
	chart.xsubproperty = $('#main-xvalues-list :selected').text();
};

function updateXValues() {
	var classURI = $('#main-class-list :selected').text();
	var propertyURI = $('#main-xvalues-list :selected').text();

	var classID = findClass(classURI);
	var propertyID = findProperty(propertyURI, classID);

	$("#subproperty-list").remove();
	if (desc.classes[classID].properties[propertyID].type == 'object_type') {
		var snippet = '<select id="subproperty-list" class="form-control"></select>';

		$("#selected-property").append(snippet);

		var subpropertyClassID = findClass(desc.classes[classID].properties[propertyID].datatype);

		updateSelectComponent('subproperty-list', desc.classes[subpropertyClassID].properties, 'uri', updateXSubProperty, xValuesFilter);
	} else {
		chart.xvalues = $('#main-xvalues-list :selected').text();
		chart.xsubproperty = '';
	}
};

function DataSourceComponent(name, parent, processSource) {
	this.name = name;
	this.parent = parent;
	this.processSource = processSource;

	this.addDataSource = function() {
		var snippet =	'<div class="panel panel-default">' +
						'<div class="panel-heading">' +
							'Data source' +
						'</div>' +
						'<div class="panel-body">' +
							'<form class="form-horizontal" role="form">' +
								'<div class="form-group">' +
									'<label class="col-sm-2 control-label">Dataset</label>' +
									'<div class="col-sm-10">' +
										'<select id="dataset-list-' + this.name + '" class="form-control"></select>' +
									'</div>' +
								'</div>' +
								'<div class="form-group">' +
									'<label class="col-sm-2 control-label">Graph</label>' +
									'<div class="col-sm-10">' +
										'<select id ="graph-list-' + this.name + '" class="form-control"></select>' +
									'</div>' +
								'</div>' +
								'<div class="form-group">' +
									'<div class="col-sm-offset-2 col-sm-10">' +
										'<button id="select-source-button-' + this.name + '" type="button" class="btn btn-success">Apply</button>' +
									'</div>' +
								'</div>' +
							'</form>' +
						'</div>' +
					'</div>';

		$(this.parent).append(snippet);
	};

	this.populateEndpoints = function() {
		var that = this;
		$.getJSON("/endpoints", function(data) {
			updateSelectComponent("dataset-list-" + that.name, data.endpoints, 'url', that.updateGraphList)
		});

		$("#select-source-button-" + that.name).click(function(event) {
			$("#dataset-list-" + that.name).prop("disabled", true);
			$("#graph-list-" + that.name).prop("disabled", true);
			$("#select-source-button-" + that.name).prop("disabled", true);

			that.endpointURL = $("#dataset-list-" + that.name + " :selected").text();
			that.graphName = $("#graph-list-" + that.name + " :selected").text();

			that.processSource(that.endpointURL, that.graphName, that.parent);
		});
	};

	this.getEndpoint = function() {
		return this.endpointURL;
	};

	this.getGraph = function() {
		return this.graphName;
	}

	this.updateGraphList = function (componentID, endpoint, index) {
		var that = this;
		$.post("/endpoints/get_graphs", { endpoint: endpoint.url }, function(data) {
			updateSelectComponent("graph-list-" + that.name, data.graphs, 'name', function() {});
		});
	};

	this.addDataSource();
	this.populateEndpoints();
};

function processSource(endpointURL, graphName, parent) {
	$.post("/endpoints/get_description", { endpoint: endpointURL, graph: graphName }, function(data) {
		desc = data.desc;

		desc.classes = removeIncompatibleTypes(desc.classes, getValidDataTypes);			

		var snippet = 	'<div class="panel panel-default">' +
							'<div class="panel-heading">X axis</div>' +
							'<div class="panel-body">' +
								'<form class="form-horizontal" role="form">' +
									'<div class="form-group">' +
										'<label class="col-sm-2 control-label">Class</label>' + 
										'<div class="col-sm-10">' +
											'<select id="main-class-list" class="form-control"></select>' + 
										'</div>' + 
									'</div>' +
									'<div class="form-group">' +
										'<label class="col-sm-2 control-label">X</label>' + 
										'<div id="selected-property" class="col-sm-10">' +
											'<select id="main-xvalues-list" class="form-control"></select>' +
										'</div>' +
									'</div>' +
								'</form>' +
							'</div>' +
						'</div>' +
						'<div class="panel panel-default">' +
							'<div class="panel-heading">' +
								'<div class="panel-title">' +
									'Y value <button id="add-line-button" type="button" class="btn btn-primary btn-xs"><span class="glyphicon glyphicon-plus"></span></button>' +
								'</div>' +
							'</div>' +
							'<div id="lines-configuration" class="panel-body"></div>' +
						'</div>' + 
						'<button id="connect-source-button" type="button" class="btn btn-primary btn-xs">Connect source</button>';

		$(parent).append(snippet);

		updateSelectComponent("main-class-list", desc.classes, 'classURI', updateMainClass);

		$("#add-line-button").click(function(event) {
			$("#main-class-list").prop("disabled", true);
			$("#main-xvalues-list").prop("disabled", true);

			addLine(desc, id);
			updateChartLine('chart-div', chart, id);
			id++;
		});

		$("#connect-source-button").click(function(event) {
			$("#main-class-list").prop("disabled", true);
			$("#main-xvalues-list").prop("disabled", true);

			chart.lines[id] = new ConnectedLine(id, desc, "#main-configuration");
			id++;
		});
	});
};

function ConnectedLine(id, desc, parent) {
	this.id = id;
	this.desc = desc;
	this.parent = parent;

	this.updateSecondaryDatasourceYValueList = function(componentID, selectedObj, descID) {
		//updateChartLine('chart-div', chart, this.id);
	};

	this.updateSecondaryDatasourcePropertyList = function(componentID, selectedObj, descID) {
		var classURI = $('#secondary-datasource-class-list-' + this.id + ' :selected').text();

		var properties = []
		for (var index = 0; index < connections.desc.classes.length; index++) {
			if (connections.desc.classes[index].classURI == classURI) {
				properties = connections.desc.classes[index].properties;
				break;
			}
		}
		updateSelectComponent("secondary-datasource-yvalues-list-" + this.id, properties, 'uri', this.updateSecondaryDatasourceYValueList.bind(this));
	};

	this.updateSecondaryDataSourceClassList = function(componentID, selectedObj, descID) {
		updateSelectComponent("secondary-datasource-property-list-" + this.id, selectedObj.pairs, 'name', this.updateSecondaryDatasourcePropertyList.bind(this));
	};

	this.processConnections = function(data) {
		connections = data.data;
		var snippet = 	'<div class="panel panel-default">' +
							'<div class="panel-heading">Y axis</div>' +
							'<div class="panel-body">' +
								'<form class="form-horizontal" role="form">' +
									'<div class="form-group">' +
										'<label class="col-sm-2 control-label">Class</label>' + 
										'<div class="col-sm-10">' +
											'<select id="secondary-datasource-class-list-' + this.id + '" class="form-control"></select>' + 
										'</div>' + 
									'</div>' +
									'<div class="form-group">' +
										'<label class="col-sm-2 control-label">Property</label>' + 
										'<div class="col-sm-10">' +
											'<select id="secondary-datasource-property-list-' + this.id + '" class="form-control"></select>' +
										'</div>' +
									'</div>' +
									'<div class="form-group">' +
										'<label class="col-sm-2 control-label">Y</label>' + 
										'<div class="col-sm-10">' +
											'<select id="secondary-datasource-yvalues-list-' + this.id + '" class="form-control"></select>' +
										'</div>' +
										'<div class="col-sm-2">' +
											'<button id="remove-datasource-button-' + this.id + '"type="button" class="btn btn-danger">X</button>' +
										'</div>' +
									'</div>' +
								'</form>' +
							'</div>' +
						'</div>';

		$(this.parent).append(snippet);

		$("#remove-datasource-button-" + this.id).click(function(event) {
			console.log("Remove datasource");
		});

		updateSelectComponent("secondary-datasource-class-list-" + this.id, connections['connections'], 'classURI', this.updateSecondaryDataSourceClassList.bind(this));
	};
	
	this.processSecondarySource = function(endpointURL, graphName, parent) {
		var post_data = { 
			first_endpoint: mainDataSource.getEndpoint(),
			first_graph: mainDataSource.getGraph(),
			mainclass: chart.mainclass,
			second_endpoint: endpointURL, 
			second_graph: graphName 
		};

		$.post("/endpoints/get_datasource_connections", post_data, this.processConnections.bind(this));
	};

	this.datasourceComponent = new DataSourceComponent("secondary-datasource-" + this.id, this.parent, this.processSecondarySource.bind(this));
};

function saveChart(report_id, chart_id) {
	chart_id = chart_id == -1 ? 'new' : chart_id;
	$.post("/report/" + report_id + "/chart/" + chart_id + "/save", 
		{ 	chart: JSON.stringify(chart),
			name: $("#chart-name-input").val()
		}, 
		function(data) {
			window.location.href = "/report/" + report_id + "/edit";
		}
	);
}

function deleteChart(report_id, chart_id) {
	$.post("/report/" + report_id + "/chart/" + chart_id + "/delete", function(data) {
		window.location.href = "/report/" + report_id + "/edit";
	});
};

/////////////////////////////////// initialization /////////////////////////////////////

var mainDataSource;

function init() {
	mainDataSource = new DataSourceComponent("main", "#main-configuration", processSource);
};

//////////////////////////////////////////////////////////////////////////////////////////