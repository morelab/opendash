# -*- coding: utf-8 -*-

from flask import jsonify, request, render_template, url_for, redirect
from flask.ext.login import login_required, current_user

import rdflib

from opendash import app, session
from opendash.form.login import LoginForm

from opendash.model.opendash_model import Endpoint, Report, Chart

DATA_TYPE = 'data_type'
OBJECT_TYPE = 'object_type'

@app.route("/report/<report_id>/edit")
@login_required
def report_edit(report_id):
	form = LoginForm(session)

	report = session.query(Report).filter_by(id=report_id).first()

	return render_template('report_edit.html', form=form, user=current_user, report=report)

@app.route("/report/<report_id>/chart/new")
@login_required
def new_chart(report_id):
	form = LoginForm(session)

	report = session.query(Report).filter_by(id=report_id).first()

	chart = Chart()

	report.charts.append(chart)

	session.commit()

	return render_template('edit.html', form=form, user=current_user, report=report, chart=chart)

@app.route("/report/<report_id>/chart/edit")
@login_required
def chart_edit(report_id):
	form = LoginForm(session)
	return render_template('edit.html', form=form, user=current_user)


@app.route("/report/<report_id>/chart/<chart_id>/save", methods=['POST'])
@login_required
def chart_save(report_id, chart_id):
	json = request.form['chart']

	chart = session.query(Chart).filter_by(id=chart_id).first()
	chart.json = json

	session.commit()	

	report = session.query(Report).filter_by(id=chart.report).first()

	return redirect(url_for("report_edit", report_id=report.id))