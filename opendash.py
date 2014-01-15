# -*- coding: utf-8 -*-

from flask import Flask, render_template
from flask import jsonify, request

import rdflib

import random

app = Flask(__name__)

endpoints = [
	{	'id': 0,
		'url': 'http://helheim.deusto.es/sparql'
	}, 
	{	'id': 1,
		'url': 'http://test2'
	}, 
	{	'id': 2,
		'url': 'http://test3'
	}
]

@app.route("/report")
def show_chart():
	return render_template('report.html')

@app.route("/endpoints")
def get_endpoints():
	return jsonify(endpoints=endpoints)

@app.route("/endpoints/get_graphs", methods=['POST'])
def get_endpoint_graphs():
	endpoint = request.form['endpoint']

	g = rdflib.ConjunctiveGraph('SPARQLStore')
	g.open(endpoint)

	qres = g.query("select distinct ?g where { graph ?g {?s ?p ?o} }")

	graphs = []
	for index, graph in enumerate(qres):
		graphs.append({'id': index, 'name': graph[0]})

	return jsonify(graphs=graphs)


def loadIgnoredPrefixes():
	ignored = []
	with open('ignored.txt') as f:
		ignored = f.read().splitlines()

	return ignored

def getFilter(var):
	ignored = loadIgnoredPrefixes()	

	filter = ''
	if len(ignored) > 0:
		filter += "FILTER ("

		first = True
		for prefix in ignored:
			if first:
				filter += " !regex(str(%s), \"%s\")" % (var, prefix)
				first = False
			else:
				filter += " && !regex(str(%s), \"%s\")" % (var, prefix)
		filter += ")"

	return filter

def get_properties(g, graph, clazz):
	query = """SELECT DISTINCT ?property (COUNT(DISTINCT ?s) AS ?count)
				FROM <%s>
				WHERE 	{ 	?s a <%s> . 
							?s ?property ?o . 
							%s 
						} GROUP BY ?property ORDER BY desc(?count) LIMIT 25"""
	
	print 'Obtaining properties'
	query =  query % (graph, clazz, getFilter("?property"))
	qres = g.query(query)

	properties = []
	for p in qres:
		properties.append({
				'uri': p[0]
			})

	return properties

@app.route("/endpoints/get_description", methods=['POST'])
def get_source_description():
	endpoint = request.form['endpoint']
	graph = request.form['graph']

	g = rdflib.ConjunctiveGraph('SPARQLStore')
	g.open(endpoint)

	print '* Endpoint %s' % endpoint
	print '* Graph %s' % graph

	print 'Obtaining available classes'

	query = "SELECT DISTINCT ?class FROM <%s> WHERE { [] a ?class " + getFilter("?class") + " } LIMIT 50"
	query = query % graph

	qres = g.query(query)

	desc = {}
	desc['endpoint'] = endpoint
	desc['graph'] = graph

	classes = []
	for c in qres:
		clazz = {}
		clazz['classURI'] = c[0]

		clazz['properties'] = get_properties(g, graph, c[0])
		classes.append(clazz)

	desc['classes'] = classes

	return jsonify(desc=desc)

@app.route("/endpoints/get_data", methods=['POST'])
def get_data():
	data = 	[	random.randrange(1000), 
				random.randrange(1000),
				random.randrange(1000),
				random.randrange(1000)
			]
	return jsonify(data=data)

if __name__ == "__main__":
	app.run(debug=True)