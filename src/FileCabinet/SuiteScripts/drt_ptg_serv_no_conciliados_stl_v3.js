/******************************************************************
 * * DisrupTT * DisrupTT Developers *
 * ****************************************************************
 * Date: 08/2022
 * Script name: PTG - SERV NO CONCILIADO STLT
 * Script id: customscript_ptg_serv_no_conciliados_stl
 * customer Deployment id: customdeploy_ptg_serv_no_conciliados_stl
 * Applied to:
 * File: drt_ptg_serv_no_conciliados_stl.js
 ******************************************************************/
/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
//define(['N/ui/serverWidget', 'N/runtime', 'N/error', 'N/format', 'N/task', 'N/redirect', 'N/ui/message', './Preliquidacion - Inventarios - Anden/drt_ptg_serv_no_conciliados_lib', 'N/url', 'N/https', 'N/record'],
define(['N/ui/serverWidget', 'N/runtime', 'N/error', 'N/format', 'N/task', 'N/redirect', 'N/ui/message', './drt_ptg_serv_no_conciliados_lib', 'N/url', 'N/https', 'N/record'],

	function (ui, runtime, error, format, task, redirect, message, lib, url, https, record) {

		const thisScript = 'customscript_ptg_serv_no_conciliados_stl';
		const thisDeploy = 'customdeploy_ptg_serv_no_conciliados_stl';
		const scGeneralScript = 'customscript_ptg_create_opor_sgc_mr';
		const scNoGeneralScript = 'customscript_drt_servicios_no_c_schedule';
		const scNoGeneralDeploy = 'customdeploy_drt_servicios_no_c_schedule';
		const sourceCRNoConcil = 'customrecord_ptg_equipos';


		function createForm(context) {

			var objScriptContext = context;
			log.audit("objScriptContext", objScriptContext);
			var objScriptRequest = context.request;
			log.audit("objScriptRequest", objScriptRequest);

			var oScript = context.request.parameters;
			log.audit("oScript", oScript);

			var oLabels = lib.getTranslate();
			var form = ui.createForm({
				title: oLabels.form
			});

			var params = {
				vehiculo: oScript.vehiculo || '',
			};
			log.audit("params stl", params);

			if (oScript.custparam_message == 'processed') {
				form.addPageInitMessage({
					type: message.Type.INFORMATION,
					message: oLabels.message1,
					duration: 10000
				});
			}

			if (oScript.custparam_message == 'error') {
				form.addPageInitMessage({
					type: message.Type.WARNING,
					message: oLabels.message2,
					duration: 5000
				});
			}


			// Asigno un script de cliente
			var script = lib.getFilebyName('drt_ptg_serv_no_conciliados_cs.js');
			log.audit("script", script);
			form.clientScriptFileId = script;

			// campos principales
			//Vehiculo
			var field = form.addField({
				id: 'custpage_vehiculo',
				type: ui.FieldType.SELECT,
				label: oLabels.label1,
				source: sourceCRNoConcil
			});
			field.setHelpText({
				help: oLabels.help8
			});
			field.defaultValue = params.vehiculo;

			//ARREGLO
			var field = form.addField({
				id: 'custpage_arreglo',
				type: ui.FieldType.TEXT,
				label: oLabels.label10,
			});
			field.updateDisplayType({
				//displayType: ui.FieldDisplayType.HIDDEN
				displayType: ui.FieldDisplayType.INLINE
			});

			// Crea la sub lista
			var sublist = form.addSublist({
				id: 'custpage_transactions',
				type: ui.SublistType.LIST,
				label: oLabels.sublist
			});

			sublist.addField({
				id: 'custpage_idinterno',
				type: ui.FieldType.TEXT,
				label: oLabels.column1
			}).updateDisplayType({
				displayType: ui.FieldDisplayType.HIDDEN
			});
			sublist.addField({
				id: 'custpage_ruta',
				type: ui.FieldType.TEXT,
				label: oLabels.column2
			}).updateDisplayType({
				displayType: ui.FieldDisplayType.HIDDEN
			});
			sublist.addField({
				id: 'custpage_planta',
				type: ui.FieldType.TEXT,
				label: oLabels.column3
			});
			sublist.addField({
				id: 'custpage_litros',
				type: ui.FieldType.TEXT,
				label: oLabels.column4
			});
			sublist.addField({
				id: 'custpage_total',
				type: ui.FieldType.TEXT,
				label: oLabels.column5
			});

			sublist.addField({
				id: 'custpage_customer',
				type: ui.FieldType.SELECT,
				label: oLabels.label8,
				source: 'customer'
			});
			field.setHelpText({
				help: oLabels.help8
			});

			field.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			field.updateBreakType({
				breakType: ui.FieldBreakType.STARTCOL
			});

			try {
				var getTransaction = lib.getAllTransaction(params);
				log.debug("getTransaction", getTransaction);
				if (getTransaction && getTransaction.length > 0) {
					var row = 0;
					for (var i = 0; i < getTransaction.length; i++) {
						var records = getTransaction[i];
						sublist.setSublistValue({
							id: 'custpage_idinterno',
							line: row,
							value: records.idInterno
						});
						sublist.setSublistValue({
							id: 'custpage_planta',
							line: row,
							value: records.planta
						});
						sublist.setSublistValue({
							id: 'custpage_ruta',
							line: row,
							value: records.ruta
						});
						sublist.setSublistValue({
							id: 'custpage_litros',
							line: row,
							value: records.litros
						});
						sublist.setSublistValue({
							id: 'custpage_total',
							line: row,
							value: records.total
						});
						sublist.setSublistValue({
							id: 'custpage_customer',
							line: row,
							value: records.cliente
						});
						row++;
					}

					field.defaultValue = row;


				}
			} catch (err) {
				log.error({
					title: 'err',
					details: JSON.stringify(err)
				});
			}

			var strFuncName = 'reloadForm("' + oScript.script + '","' + oScript.deploy + '")';
			form.addButton({
				id: 'custpage_search',
				label: oLabels.button1,
				functionName: strFuncName
			});

			form.addSubmitButton({
				label: oLabels.button4
			});

			context.response.writePage(form);
		}

		function onRequest(context) {

			if (context.request.method === 'GET') {
				createForm(context);
			}

			if (context.request.method === 'POST') {
				log.debug("obj POST", "Entro al POST");
				var oLabels = lib.getTranslate();
				var obj = context.request.parameters;
				log.debug("obj POST", obj.custpage_arreglo);

				if (obj.custpage_arreglo) {
					//PTG - Histórico Concialiación
					log.debug("obj POST", obj.custpage_arreglo);
					var customRecHistorico = record.create({
						type: "customrecord_ptg_historico_conciliacion",
						isDynamic: true,
					});
					customRecHistorico.setValue("custrecord_ptg_ruta_historico_concil", obj.custpage_vehiculo);
					customRecHistorico.setValue("custrecord_ptg_json_historico_concil", obj.custpage_arreglo);

					var recIdHistorico = customRecHistorico.save();
					log.debug({
						title: "Registro de Facturación Intercompañia Creado",
						details: "Id Saved: " + recIdHistorico,
					});

					var arregloOrdenes = JSON.parse(obj.custpage_arreglo);
					var objPublicoGneral = {};
					var objClienteDiferente = {};
					var arrayPublicoG = [];
					var arrayClienteD = [];
					
					log.debug('arregloOrdenes1',arregloOrdenes.length)
					for(var h in arregloOrdenes){
						log.debug('h', h);
						var idInterno = arregloOrdenes[h].idInterno;
						var ruta = arregloOrdenes[h].ruta;
						var planta = arregloOrdenes[h].planta;
						var litros = arregloOrdenes[h].litros;
						var total = arregloOrdenes[h].total;
						var customer = arregloOrdenes[h].customer;
	
						if(customer == 16372){
							objPublicoGneral = {
								idInterno: idInterno,
								planta: planta,
								ruta: ruta,
								litros: litros,
								total: total,
								customer: customer
							}
	
							arrayPublicoG.push(objPublicoGneral)
						}
	
						if(customer != 16372){
							objClienteDiferente = {
								idInterno: idInterno,
								planta: planta,
								ruta: ruta,
								litros: litros,
								total: total,
								customer: customer
							}
							arrayClienteD.push(objClienteDiferente)
						}
					}
					log.debug('arrayPublicoG',arrayPublicoG);
					log.debug('arrayClienteD',arrayClienteD);
				}

				var GeneralParams = {
					custscript_ptg_arreglo_clientes : arrayPublicoG
				};

				var NoGeneralParams = {
					custscript_ptg_sgc_opor_update: arrayClienteD
				};


				try {
					if (arrayPublicoG.length > 0 ) {
						var GeneralTask = task.create({
							taskType: task.TaskType.MAP_REDUCE,
							scriptId: scGeneralScript,
							params: GeneralParams
						});
						var general = GeneralTask.submit();
					}
					log.debug("general", general);
					
					if (arrayClienteD.length > 0 ) {
						var NoGeneralTask = task.create({
							taskType: task.TaskType.SCHEDULED_SCRIPT,
							scriptId: scNoGeneralScript,
							deploymentId : scNoGeneralDeploy,
							params: NoGeneralParams
						});
						var Nogeneral = NoGeneralTask.submit();
						
					}
					log.debug("Nogeneral", Nogeneral);
					

					var toStlt = redirect.toSuitelet({
						scriptId: thisScript,
						deploymentId: thisDeploy,
						parameters: {
							'custparam_message': 'processed',
						}
					});
					log.audit("toStlt", toStlt);

				} catch (err) {
					log.error({
						title: 'err',
						details: JSON.stringify(err)
					});
					throw error.create({
						name: err.name,
						message: err.message
					});
				}
			}
		}

		return {
			onRequest: onRequest
		};
	});