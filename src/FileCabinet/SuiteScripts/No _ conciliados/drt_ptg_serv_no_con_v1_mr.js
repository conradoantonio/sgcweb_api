/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
 define(["N/record", "N/runtime", "N/search", "SuiteScripts/dev/moment"], function (record, runtime, search, moment) {

    function getInputData() {
        try {
            var respuesta = '';
            var id_search = runtime.getCurrentScript().getParameter({
                name: 'custscript_ptg_arreglo_clientes'
            }) || '';
            log.audit("id_search 1", id_search);

            respuesta = JSON.parse(id_search);

        } catch (error_getInputData) {
            log.audit('error_getInputData', error_getInputData)
        } finally {
            log.audit({
                title: 'respuesta getInputData Finally',
                details: JSON.stringify(respuesta)
            });
            return respuesta;
        }
    }

    function map(context) {
        try {
            log.audit({
                title: 'context map',
                details: JSON.stringify(context)
            });

            var objValue = JSON.parse(context.value);
            log.audit("objValueM", objValue);
            context.write(objValue);

        } catch (error_map) {
            log.audit('error_map', error_map);
        }
    }

    function reduce(context) {
        try {
            log.audit({
                title: 'context reduce',
                details: JSON.parse(context.key)
            });

            var data = JSON.parse(context.key);
            log.debug('Data', data);

            // Se verifica si el registro no conciliado es de SGC web o local
            var sinConciliar = record.load({
                type: 'customrecord_ptg_registros_sin_conciliar',
                id: data.idInterno,
                isDynamic: true
            });

            var tipoSgc        = sinConciliar.getValue({fieldId:'custrecord_ptg_tipo_sgc'});
            var litrosSurtidos = sinConciliar.getValue({fieldId:'custrecord_ptg_litros_sin_conciliar'});
            var totalPorLitro  = sinConciliar.getValue({fieldId:'custrecord_ptg_total_ser_sin_conciliar'});
            var totalCalculado = Number(litrosSurtidos) * Number(totalPorLitro);
            log.debug('Tipo SGC', tipoSgc );
            log.debug('litrosSurtidos', litrosSurtidos );
            log.debug('totalPorLitro', totalPorLitro );
            log.debug('totalCalculado', totalCalculado );
            // log.debug('Fecha inicio SGC value', sinConciliar.getValue({fieldId:'custrecord_ptg_fechainicio_sgc'}) );
            var customform = 265;
            var cliente = data.customer;
            var cantidad = data.litros;
            var total = data.total;
            var idRegistro = data.idInterno;
            var plantaRelaciona = data.planta;
            
            var ruta = data.ruta;
            
            var calculo = ( tipoSgc == 1 ? ( Number(litrosSurtidos) * Number(totalPorLitro) ): (total * cantidad) * 1.16 );
            
            log.audit('calculo', calculo);
            
            var arregloPrecio = {"pago":[{"metodo_txt":"Efectivo","tipo_pago":1,"tipo_cuenta":"","tipo_tarjeta":"","monto":calculo,"folio":""}]};
            log.audit('arregloPrecio',JSON.stringify(arregloPrecio));
            // return;

            var currency = 1;
            var tipo_servicio = 2;
            var entity_status = 13;
            var gaslp = 4216;
            var custbody_ptg_tipo_sgc = 2;
            var oportunidadId = null;
            // Busca un registro de viaje activo
            if(ruta) {
                var customrecord_ptg_tabladeviaje_enc2_SearchObj = search.create({
                    type: "customrecord_ptg_tabladeviaje_enc2_",
                    filters:
                    [
                       ["custrecord_ptg_vehiculo_tabladeviajes_","anyof", ruta], 
                       "AND", 
                       ["custrecord_ptg_viajeactivo_","is","T"]
                    ],
                    columns:
                    [
                       "internalid",
                       "custrecord_ptg_ruta",
                       "custrecord_ptg_vehiculo_tabladeviajes_"
                    ]
                 });

                 var resultCountCustom = customrecord_ptg_tabladeviaje_enc2_SearchObj.run().getRange(0, 1);
                if (resultCountCustom.length > 0) {
                    var viajeActivoId = resultCountCustom[0].getValue({
                        name: 'internalid'
                    });

                    var vehiculo = resultCountCustom[0].getValue({
                        name: 'custrecord_ptg_vehiculo_tabladeviajes_'
                    });
                }
                 
            }
            
            var newOportunidad = record.create({
                type: record.Type.OPPORTUNITY
            });

            if ( tipoSgc == 1 ) {// SGC WEB
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

                newOportunidad.setValue({fieldId:'custbody_ptg_tipo_servicio', value: tipo_servicio});
                
                // Campos en clasificación
                newOportunidad.setText({fieldId:'custbody_ptg_opcion_pago_obj', text: JSON.stringify(arregloPrecio)});
    
                // newOportunidad.setValue({fieldId:'customform', value: 124});
                newOportunidad.setValue({fieldId:'customform', value: customform});
                newOportunidad.setValue({fieldId:'entity', value: cliente});// Público general
                newOportunidad.setValue({fieldId:'entitystatus', value: entity_status});
                newOportunidad.setValue({fieldId:'currency', value: currency});
                newOportunidad.setValue({fieldId:'custbody_ptg_estado_pedido', value: 3});
                newOportunidad.setText({fieldId:'custbody_ptg_folio_aut', text: folio});
                
                // Campos SGC web
                newOportunidad.setText({fieldId:'custbody_ptg_folio_sgc_', text: folio});
                newOportunidad.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: moment(fechaIni).format('D/M/YYYY h:mm:ss A')});
                newOportunidad.setText({fieldId:'custbody_fecha_final_sgc_', text: moment(fechaFin).format('D/M/YYYY h:mm:ss A')});
                // newOportunidad.setText({fieldId:'custbody_fecha_final_sgc_', text: element.fecha_fin});
                // newOportunidad.setValue({fieldId:'custbody_ptg_status_sgc_', value: values.vendedor });
                newOportunidad.setValue({fieldId:'custbody_ptg_tipodeservicio_', value: tipoServ });
                newOportunidad.setText({fieldId:'custbody_ptg_foliounidad_sgc', text: folioUni});
                newOportunidad.setText({fieldId:'custbody_ptg_totalizador_inicial_sgc', text: totInicial});
                newOportunidad.setText({fieldId:'custbody_totalizador_final_sgc_', text: totFinal});
                newOportunidad.setValue({fieldId:'custbody_ptg_tipo_de_pago_sgc_', value: tipoPago});
                newOportunidad.setValue({fieldId:'custbody_ptg_tipo_sgc', value: tipoSgc});// Se indica que el registro es de SGC web
                
                // Sólo se setea el número de viaje si es que existe
                if ( viajeActivoId ) {
                    newOportunidad.setValue({fieldId:'custbody_ptg_numero_viaje', value: viajeActivoId});
                }

                newOportunidad.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: 0,
                    value: gaslp
                });
                //log.audit('Se asigna el producto de gas LP', gaslp);
    
                newOportunidad.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: 0,
                    value: cantidad //Se obtiene de registro no conciliado
                });
                //log.audit('Se asigna la cantidad', cantidad);
    
                newOportunidad.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: 0,
                    value: total //Se obtiene de registro no conciliado
                });

                var oportunidadId = newOportunidad.save();

                log.debug('Info', 'Opotunidad guardada exitósamente: '+oportunidadId);

            } else {// SGC LOCAL
                newOportunidad.setValue({fieldId: 'customform', value: customform});
                newOportunidad.setValue({fieldId: 'custbody_ptg_tipo_servicio', value: tipo_servicio});
                //log.audit('Se asigna tipo servicio', tipo_servicio);
                newOportunidad.setValue({fieldId: 'currency', value: currency});
                //log.audit('Se asigna la currency', currency);
                newOportunidad.setValue({fieldId: 'entity',value: cliente});
                //log.audit('Se asigna el entity/customer', cliente);
                newOportunidad.setValue({fieldId: 'entitystatus', value: entity_status});
                //log.audit('Se asigna el entitystatus', entity_status);
                newOportunidad.setValue({fieldId: "custbody_ptg_estado_pedido", value: 3});    
                newOportunidad.setValue({fieldId: "custbody_ptg_planta_relacionada", value: plantaRelaciona});    
                // newOportunidad.setValue({fieldId: "custbody_ptg_ruta_asignada", value: plantaRelaciona});
                newOportunidad.setValue({fieldId: "custbody_ptg_numero_viaje", value: viajeActivoId});    
                newOportunidad.setValue({fieldId: "custbody_ptg_numero_vehiculo", value: vehiculo});    
                newOportunidad.setValue({fieldId: "custbody_ptg_tipo_sgc", value: custbody_ptg_tipo_sgc});    
                newOportunidad.setValue({fieldId: "custbody_ptg_opcion_pago_obj", value: JSON.stringify(arregloPrecio)});    
                // Se agrega el producto de Gas LP a nivel artículo
                newOportunidad.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: 0,
                    value: gaslp
                });
                //log.audit('Se asigna el producto de gas LP', gaslp);
    
                newOportunidad.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: 0,
                    value: cantidad //Se obtiene de registro no conciliado
                });
                //log.audit('Se asigna la cantidad', cantidad);
    
                newOportunidad.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: 0,
                    value: totalPorLitro //Se obtiene de registro no conciliado
                });
    
                oportunidadId = newOportunidad.save();
    
                log.audit('oportunidadId', oportunidadId);
            }

            // Si todo salió bien al crear la nueva oportunidad, se modifica el registro sin conciliar para asignarle una oportunidad
            if( oportunidadId ) {
                // var sinConciliar = record.load({
                //     type: 'customrecord_ptg_registros_sin_conciliar',
                //     id: idRegistro,
                //     isDynamic: true,
                // });

                sinConciliar.setValue({ fieldId: 'custrecord_ptg_sgcloc_opor_noconcil', value: oportunidadId });

                var saveRegistro = sinConciliar.save();
                log.audit('saveRegistro', saveRegistro);
            }

        } catch (error_rudece) {
            log.error({
                title: 'error reduce',
                details: JSON.stringify(error_rudece)
            });
        }
    }

    function summarize(summary) {

    }

 

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});