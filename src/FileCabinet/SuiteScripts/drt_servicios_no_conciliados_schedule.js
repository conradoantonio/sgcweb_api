/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
 define(['N/https', 'N/record', 'N/search', 'N/runtime', 'SuiteScripts/dev/moment'],
 /**
* @param{https} https
* @param{record} record
* @param{search} search
*/
(https, record, search, runtime, moment) => {
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = (scriptContext) => {
        try {
            const hora = Date.now();
            let oportunidadesAfectadas = [];
            // Buscar servicios no conciliados
            let oportunidadesArray = JSON.parse(runtime.getCurrentScript().getParameter('custscript_ptg_sgc_opor_update'));

            log.debug('oportunidadesArraytypeOf', typeof oportunidadesArray);
            log.debug('oportunidadesArray', oportunidadesArray);

            if (oportunidadesArray.length > 0) {
                oportunidadesArray.forEach(servicio => {
                // Se verifica si el registro no conciliado es de SGC web o local
                var sinConciliar = record.load({
                    type: 'customrecord_ptg_registros_sin_conciliar',
                    id: servicio.idInterno,
                    isDynamic: true
                });

                var tipoSgc = sinConciliar.getValue({fieldId:'custrecord_ptg_tipo_sgc'});

                log.debug('tipoSgc', tipoSgc);
                log.debug('Servicio', servicio);
                // return;
                    let cliente = servicio.customer;
                    let servicio_id = servicio.idInterno;
                    let location_id = servicio.planta;
                    let num_ruta = servicio.ruta;

                    var customrecord_ptg_tabladeviaje_enc2_Search = search.create({
                        type: "customrecord_ptg_tabladeviaje_enc2_",
                        filters:
                            [
                                ["custrecord_ptg_vehiculo_tabladeviajes_.internalidnumber", "equalto", num_ruta],
                                "AND",
                                ["custrecord_ptg_id_vehiculo_sgc", "isnotempty", ""]
                            ],
                        columns:
                            [
                                "custrecord_ptg_id_vehiculo_sgc"
                            ]
                    });

                    var searchResultCountNumRuta = customrecord_ptg_tabladeviaje_enc2_Search.runPaged().count;
                    log.debug("Búsqueda por número de ruta para encontrar id_vehiculo result count", searchResultCountNumRuta);

                //  Sólo si hay un viaje activo con este número de vehículo, se procede a validar la búsqueda de una oportunidad
                    if (searchResultCountNumRuta > 0) {

                        let customrecord_ptg_equiposSearchResult = customrecord_ptg_tabladeviaje_enc2_Search.run().getRange({ start: 0, end: searchResultCountNumRuta });
                        let id_vehiculo = customrecord_ptg_equiposSearchResult[0].getValue({ name: "custrecord_ptg_id_vehiculo_sgc" });
                        let litros = servicio.litros;
                        let total = servicio.total;

                        log.audit({
                            title: 'Buscando por variables:',
                            details: `Buscando por planta: ${location_id} vehículo: ${id_vehiculo} Cliente: ${cliente} Litros: ${litros} Total: ${total}`
                        })

                    if ( tipoSgc == 1 ) {// SGC web
                        var oppSearchArr = [];
                        var opportunitySearchObj = search.create({
                            type: "opportunity",
                            filters:
                            [
                            //    ["subsidiary","anyof","25"], 
                            //    "AND", 
                                ["entitystatus","anyof","11"], 
                                "AND", 
                                ["custbody_ptg_estado_pedido","anyof","2"], 
                                "AND", 
                                ["custbody_ptg_planta_relacionada","anyof",location_id], 
                                "AND", 
                                ["custbody_ptg_numero_viaje.custrecord_ptg_vehiculo_tabladeviajes_","anyof",num_ruta], 
                                "AND", 
                                ["customer.internalid","anyof",cliente]
                            ],
                            columns:
                            [
                                search.createColumn({name: "title", label: "Título"}),
                                search.createColumn({
                                    name: "tranid",
                                    sort: search.Sort.DESC,
                                    label: "Número de documento"
                                }),
                                search.createColumn({name: "entity", label: "Cliente"}),
                                search.createColumn({name: "salesrep", label: "Representante de ventas"}),
                                search.createColumn({name: "trandate", label: "Fecha"}),
                                search.createColumn({name: "custbody_ptg_numero_viaje", label: "PTG - Número de Viaje"}),
                                search.createColumn({name: "custbody_ptg_ruta_asignada", label: "PTG - RUTA ASIGNADA"}),
                                search.createColumn({name: "custbody_ptg_planta_relacionada", label: "PTG - PLANTA RELACIONADA AL PEDIDO"}),
                                search.createColumn({name: "expectedclosedate", label: "Cierre previsto"}),
                                search.createColumn({name: "custbody_ptg_estado_pedido", label: "PTG - ESTADO DEL PEDIDO"}),
                                search.createColumn({name: "projectedtotal", label: "Total previsto"}),
                                search.createColumn({name: "internalid", label: "ID interno"}),
                                search.createColumn({name: "custbody_ptg_precio_articulo_zona", label: "PTG - PRECIO DEL ARICULO EN LA ZONA"}),
                                search.createColumn({name: "custbody_ptg_zonadeprecioop_", label: "PTG - Zona de precio Oportuidad"}),
                                search.createColumn({name: "custbody_ptg_folio_aut", label: "PTG - FOLIO DE AUTORIZACIÓN"}),
                                search.createColumn({name: "custbody_ptg_folio_sgc_", label: "PTG - Folio SGC"}),
                                search.createColumn({name: "entitystatus", label: "Estado de oportunidad"}),
                                search.createColumn({
                                    name: "custrecord_ptg_vehiculo_tabladeviajes_",
                                    join: "CUSTBODY_PTG_NUMERO_VIAJE",
                                    label: "PTG - Vehiculo (Tabla de Viajes)"
                                }),
                                search.createColumn({
                                    name: "custrecord_ptg_id_vehiculo_sgc",
                                    join: "CUSTBODY_PTG_NUMERO_VIAJE",
                                    label: "PTG - ID VEHICULO SGC"
                                })
                            ]
                            });
                            var searchResultCount = opportunitySearchObj.runPaged().count;
                            log.debug("opportunitySearchObj sgc web result count",searchResultCount);
                            opportunitySearchObj.run().each(function(result){
                            var values = result.getAllValues();
                            log.debug('Values busqueda no conciliado', values);
                            var obj = {};

                            obj.id = Number(values.internalid[0].value);

                            oppSearchArr.push(obj);

                            return true;
                            });

                            log.debug('oppSearchArr', oppSearchArr);

                            // Se encontró una oportunidad para actualizar
                            if ( oppSearchArr.length ) {
                            var folio      = sinConciliar.getText({fieldId:'custrecord_ptg_folio_reg_sin_conciliar'});
                            var tipoServ   = sinConciliar.getValue({fieldId:'custrecord_ptg_tipodeservicio_'});
                            var folioUni   = sinConciliar.getText({fieldId:'custrecord_ptg_foliounidad_sgc'});
                            var totInicial = sinConciliar.getText({fieldId:'custrecord_ptg_totalizador_inicial_sgc'});
                            var totFinal   = sinConciliar.getText({fieldId:'custrecord_totalizador_final_sgc_'});
                            var tipoPago   = sinConciliar.getValue({fieldId:'custrecord_ptg_tipo_de_pago_sgc_'});
                            var fechaIni   = sinConciliar.getValue({fieldId:'custrecord_ptg_fechainicio_sgc'});
                            var fechaFin   = sinConciliar.getValue({fieldId:'custrecord_fecha_final_sgc_'});

                            log.debug('folio', folio);
                            log.debug('tipoServ', tipoServ);
                            log.debug('folioUni', folioUni);
                            log.debug('totInicial', totInicial);
                            log.debug('totFinal', totFinal);
                            log.debug('tipoPago', tipoPago);
                            log.debug('fechaIni', fechaIni);
                            log.debug('fechaFin', fechaFin);
                            // return;
                            
                            
                            var oppRecord = record.load({id : oppSearchArr[0].id, type: record.Type.OPPORTUNITY});
                            // log.debug('Respuesta sgcweb obtener lista por folio', responseServ.info);
                            // log.debug('Respuesta sgcweb en json', servicesValues);
                            // log.debug('SGC', 'Servicios consultados exitósamente');
                            
                            oppRecord.setText({fieldId:'custbody_ptg_folio_sgc_', text: folio});
                            // oppRecord.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: element.fecha_inicio});
                            oppRecord.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: moment(fechaIni).format('D/M/YYYY h:mm:ss A')});
                            oppRecord.setText({fieldId:'custbody_fecha_final_sgc_', text: moment(fechaFin).format('D/M/YYYY h:mm:ss A')});
                            oppRecord.setValue({fieldId:'custbody_ptg_tipodeservicio_', value: tipoServ });
                            oppRecord.setText({fieldId:'custbody_ptg_foliounidad_sgc', text: folioUni});
                            oppRecord.setText({fieldId:'custbody_ptg_totalizador_inicial_sgc', text: totInicial});
                            oppRecord.setText({fieldId:'custbody_totalizador_final_sgc_', text: totFinal});
                            oppRecord.setValue({fieldId:'custbody_ptg_tipo_de_pago_sgc_', value: tipoPago});
                            oppRecord.setValue({fieldId:'custbody_ptg_estado_pedido', value: 3});
                            oppRecord.setValue({fieldId:'entitystatus', value: 13});
                            // oppRecord.setValue({fieldId:'custbody_ptg_tipo_sgc', value: tipoSgc});// Se indica que el registro es de SGC web

                            oppRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: 0,
                                value: litros ?? 0
                            });

                            oppRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                line: 0,
                                value: total ?? 0
                            });
            
                            var oportunidadId = oppRecord.save();
                            
                            log.debug('Info', 'Registro actualizado exitósamente por sgc web '+oportunidadId);

                            sinConciliar.setValue({ fieldId: 'custrecord_ptg_sgcloc_opor_noconcil', value: oportunidadId });

                            var saveRegistro = sinConciliar.save();
                            log.debug('Registro sin conciliar actualizado exitósamente', saveRegistro);

                            } else {
                            log.debug('Error', 'No se encontró ningún servicio de sgc con este criterio de búsqueda');
                            }
                            
                            return;
                    } else {// Sgc local

                        var opportunitySearchObj = search.create({
                            type: "opportunity",
                            filters:
                                [
                                    ["entitystatus", "anyof", "11"],
                                    "AND",
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_servicioestacionario_", "is", "T"],
                                    "AND",
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_viajeactivo_", "is", "T"],
                                    "AND",
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_estatus_tabladeviajes_", "anyof", "3"],
                                    "AND",
                                    ["custbody_ptg_planta_relacionada.internalid", "anyof", location_id],
                                    "AND",
                                    ["customer.internalid", "is", cliente],
                                    "AND",
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_id_vehiculo_sgc", "is", id_vehiculo]
                                ],
                            columns:
                                [
                                    "internalid",
                                    "trandate",
                                    "tranid",
                                    "entity",
                                    "entitystatus",
                                    search.createColumn({
                                        name: "custbody_ptg_numero_viaje",
                                        sort: search.Sort.DESC
                                    }),
                                    search.createColumn({
                                        name: "custrecord_ptg_vehiculo_tabladeviajes_",
                                        join: "CUSTBODY_PTG_NUMERO_VIAJE"
                                    }),
                                    search.createColumn({
                                        name: "custrecord_ptg_id_vehiculo_sgc",
                                        join: "CUSTBODY_PTG_NUMERO_VIAJE"
                                    }),
                                    search.createColumn({
                                        name: "internalid",
                                        join: "CUSTBODY_PTG_PLANTA_RELACIONADA"
                                    })
                                ]
                        });
                        var searchResultCount = opportunitySearchObj.runPaged().count;

                        if (searchResultCount > 0) {
                            try {
                                let entity_status = 13;
                                let custbody_ptg_estado_pedido = 3;

                                let opportunitySearchResult = opportunitySearchObj.run().getRange({ start: 0, end: searchResultCount });
                                let recOportunidad = record.load({
                                    type: "opportunity",
                                    id: opportunitySearchResult[0].getValue({ name: "internalid" })
                                });

                                log.audit('Se actualiza la oportunidad', opportunitySearchResult[0].getValue({ name: "internalid" }));
                                recOportunidad.setValue({
                                    fieldId: "entitystatus",
                                    value: entity_status
                                });

                                recOportunidad.setValue({
                                    fieldId: "custbody_ptg_estado_pedido",
                                    value: custbody_ptg_estado_pedido
                                });

                                recOportunidad.setValue({
                                    fieldId: "custbody_ptg_tipo_sgc",
                                    value: 2
                                });

                                recOportunidad.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    line: 0,
                                    value: litros ?? 0
                                });
                                log.audit('Se asigna la cantidad', litros);

                                recOportunidad.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    line: 0,
                                    value: total ?? 0
                                });
                                log.audit('Se asigna el precio', total);

                                let oportunidadId = recOportunidad.save();
                                oportunidadesAfectadas.push(oportunidadId);
                                log.debug(`Se actualiza la oportunidad: ${oportunidadId}`);

                                var opportunityRecord = record.load({
                                    type: "customrecord_ptg_tabladeviaje_enc2_",
                                    id: num_ruta
                                });
                                var serviciosNoConciliados = opportunityRecord.getValue({
                                    fieldId: "custrecord_ptg_contador_sin_conciliar"
                                }) || 0;

                                serviciosNoConciliados = parseInt(serviciosNoConciliados) - 1;

                                opportunityRecord.setValue({
                                    fieldId: "custrecord_ptg_contador_sin_conciliar",
                                    value: serviciosNoConciliados
                                });

                                var savedOpportunity = opportunityRecord.save();
                                log.debug("Update Contador", `Updated contador: id: ${oportunidadId} - Contador: ${serviciosNoConciliados}`);

                                // Guardar
                                let servicioConciliado = record.load({
                                    type: "customrecord_ptg_registros_sin_conciliar",
                                    id: servicio_id
                                });

                                servicioConciliado.setValue({
                                    fieldId: "custrecord_ptg_sgcloc_opor_noconcil",
                                    value: oportunidadId
                                });

                                servicioConciliado.save();
                                // }

                            } catch (error) {
                                log.error("Error loading record: ", error);
                            }
                        } else {
                            log.audit('No se encontró oportunidad para el servicio:', servicio_id);
                        }
                    }

                    } else {
                        log.audit('No se encontró vehículo para el servicio:', servicio_id);
                    }

                });
            }
            log.audit('Se actualizaron las oportunidades', oportunidadesAfectadas);
            log.audit(`Script finalizado en ${Date.now() - hora} ms`);

        } catch (error) {
            log.debug('Error scheduled:', error)
        }
    }
    return { execute }
});