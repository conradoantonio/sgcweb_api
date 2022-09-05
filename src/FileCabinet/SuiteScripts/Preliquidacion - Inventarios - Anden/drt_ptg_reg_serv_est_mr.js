/******************************************************************
 * * DisrupTT * DisrupTT Developers *
 * ****************************************************************
 * Date: 06/2022
 * Script name: PTG - Registro de Servicios Estaciona MR
 * Script id: customscript_drt_ptg_reg_serv_est_mr
 * Deployment id: customdeploy_drt_ptg_reg_serv_est_mr
 * Applied to: 
 * File: drt_ptg_reg_serv_est_mr.js
 ******************************************************************/

/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
 define(['N/runtime', 'N/search', 'N/record', 'N/email', 'N/error', 'N/url', 'N/https', 'SuiteScripts/dev/moment'], function (runtime, search, record, email, error, url, https, moment) {

    function getInputData() {
        try {
            var respuesta = '';

            var idRegistro = runtime.getCurrentScript().getParameter({
                name: 'custscript_drt_ptg_id_registro_serv_est'
            }) || '';
            log.debug("idRegistro", idRegistro);
             
            var arrayColumns = [
                search.createColumn({name: "custrecord_ptg_cliente_reg_serv_est_lin", label: "PTG - Cliente"}),
                search.createColumn({name: "custrecord_ptg_articulo_reg_serv_est_lin", label: "PTG - Artículo"}),
                search.createColumn({name: "custrecord_ptg_cantidad_reg_serv_est_lin", label: "PTG - Cantidad"}),
                search.createColumn({name: "custrecord_ptg_precio_reg_serv_est_lin", label: "PTG - Precio"}),
                search.createColumn({name: "custrecord_ptg_subtotal_registro_servs_e", label: "PTG - SUBTOTAL"}),
                search.createColumn({name: "custrecord_ptg_impuesto_reg_serv_est_lin", label: "PTG - Impuesto"}),
                search.createColumn({name: "custrecord_ptg_total_reg_serv_est_lin", label: "PTG - Total"}),
                search.createColumn({name: "custrecord_ptg_form_pago_reg_serv_est_li", label: "PTG - Forma de Pago"}),
                search.createColumn({name: "custrecord_ptg_zonadeprecio_est", label: "PTG -Zona de precio"}),
                search.createColumn({name: "custrecord_ptg_esta_car_reg_serv_est_lin", label: "PTG - Estación Carburación"}),
                search.createColumn({name: "custrecord_ptg_vehiculo_reg_serv_est_lin", label: "PTG - No. Vehiculo Destino"}),
                search.createColumn({name: "custrecord_ptg_num_vdes_reg_serv_est_lin", label: "PTG - Número de Viaje Destino"}),
                search.createColumn({name: "custrecord_ptg_referencia_est", label: "PTG - Referencia"}),
                search.createColumn({name: "custrecord_ptg_kilometraje_serv_est_lin", label: "PTG - Kilometraje"}),
                search.createColumn({name: "custrecord_ptg_ruta_sin_conciliar_2", label: "PTG - Ruta"}),
                search.createColumn({name: "custrecord_ptg_planta_sin_conciliar_2", label: "PTG - Planta"}),
                search.createColumn({name: "custrecord_ptg_litros_sin_conciliar_2", label: "PTG - Litros surtidos"}),
                search.createColumn({name: "custrecord_ptg_folio_reg_sin_c_2", label: "PTG - Folio"}),
                search.createColumn({name: "custrecord_ptg_sgcloc_opor_noconcil_2", label: "PTG - Oportunidad 2"}),
                search.createColumn({name: "custrecord_ptg_sgcloc_fecha_2_", label: "PTG - Fecha sin conciliar"}),
                search.createColumn({name: "custrecord_ptg_sgcloc_hora_2_", label: "PTG - Hora"}),
                search.createColumn({name: "custrecord_ptg_folio_aut_2_", label: "PTG - Folio de Autorización"}),
                search.createColumn({name: "custrecord_ptg_folio_sgc_2_", label: "PTG - Folio SGC"}),
                search.createColumn({name: "custrecord_ptg_fechainicio_sgc_2_", label: "PTG - Fecha Inicio SGC"}),
                search.createColumn({name: "custrecord_fecha_final_sgc_2_", label: "PTG - Fecha Final SGC"}),
                search.createColumn({name: "custrecord_ptg_status_sgc_2_", label: "PTG - Status SGC"}),
                search.createColumn({name: "custrecord_ptg_tipodeservicio_2_", label: "PTG - Tipo de Servicio"}),
                search.createColumn({name: "custrecord_ptg_foliounidad_sgc_2_", label: "PTG - Folio Unidad SGC"}),
                search.createColumn({name: "custrecord_ptg_totalizador_inicia_sgc_2", label: "PTG - Totalizador Inicial SGC"}),
                search.createColumn({name: "custrecord_totalizador_final_sgc_2_", label: "PTG - TOTALIZADOR FINAL SGC"}),
                search.createColumn({name: "custrecord_fecha_final_sgc_2_", label: "PTG - Fecha Final SGC"}),
                search.createColumn({name: "custrecord_ptg_tipo_de_pago_sgc_2_", label: "PTG - Tipo de Pago SGC"}),
                search.createColumn({name: "custrecord_ptg_dispensador_2_", label: "PTG - Dipensador"}),
                search.createColumn({name: "custrecord_ptg_tipo_sgc_2_", label: "PTG - Tipo SGC"})
            ];

            var arrayFilters = [
                ["custrecord_ptg_id_reg_serv_est_lin","anyof",idRegistro], "AND", 
                ["custrecord_ptg_oportun_reg_serv_est_lin","anyof","@NONE@"], "AND", 
                ["custrecord_ptg_transa_reg_serv_est_lin","anyof","@NONE@"]
             ],

            //BÚSQUEDA GUARDADA: PTG - Registro de Servicios Cilindros SS
            respuesta = search.create({
                type: 'customrecord_ptg_registro_servicios_es_l',
                columns: arrayColumns,
                filters: arrayFilters
            });


        } catch (error) {
            log.audit({
                title: 'error getInputData',
                details: JSON.stringify(error)
            });
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
            var idRegistroCilindroLinea = objValue.id;
            var objPagos = {};
            var arrayPagos = [];
            var objPagosOportunidad = {};
            var regServCilUpdate = {};
            var oportunidadArray = [];
            var solicitaFactura = false;
            var cliente = objValue.values["custrecord_ptg_cliente_reg_serv_est_lin"].value;
            var articulo = objValue.values["custrecord_ptg_articulo_reg_serv_est_lin"].value;
            var cantidad = objValue.values["custrecord_ptg_cantidad_reg_serv_est_lin"];
            var subTotal = objValue.values["custrecord_ptg_subtotal_registro_servs_e"];
            var precio = objValue.values["custrecord_ptg_precio_reg_serv_est_lin"];
            var impuesto = objValue.values["custrecord_ptg_impuesto_reg_serv_est_lin"];
            var montoPago = objValue.values["custrecord_ptg_total_reg_serv_est_lin"];
            var formaPago = objValue.values["custrecord_ptg_form_pago_reg_serv_est_li"].value;
            var formaPagoTXT = objValue.values["custrecord_ptg_form_pago_reg_serv_est_li"].text;
            var zonaPrecio = objValue.values["custrecord_ptg_zonadeprecio_est"].value;
            var estacionCarburacion = objValue.values["custrecord_ptg_esta_car_reg_serv_est_lin"].value;
            var vehiculoDestino = objValue.values["custrecord_ptg_vehiculo_reg_serv_est_lin"].value;
            var viajeDestino = objValue.values["custrecord_ptg_num_vdes_reg_serv_est_lin"].value;
            var referencia = objValue.values["custrecord_ptg_referencia_est"];
            var kilometraje = objValue.values["custrecord_ptg_kilometraje_serv_est_lin"];
            var rutaConciliar = objValue.values["custrecord_ptg_ruta_sin_conciliar_2"].value;
            var planta = objValue.values["custrecord_ptg_planta_sin_conciliar_2"].value;
            var litrosSurtidos = objValue.values["custrecord_ptg_litros_sin_conciliar_2"];
            var folio = objValue.values["custrecord_ptg_folio_reg_sin_c_2"];
            var oportunidad2 = objValue.values["custrecord_ptg_sgcloc_opor_noconcil_2"].value;
            var fechaSinConciliar = objValue.values["custrecord_ptg_sgcloc_fecha_2_"];
            var hora = objValue.values["custrecord_ptg_sgcloc_hora_2_"];
            var folioAutorizacion = objValue.values["custrecord_ptg_folio_aut_2_"];
            var folioSGC = objValue.values["custrecord_ptg_folio_sgc_2_"];
            var fechaInicioSGC = objValue.values["custrecord_ptg_fechainicio_sgc_2_"];
            var fechaFinSGC = objValue.values["custrecord_fecha_final_sgc_2_"];
            var statusSGC = objValue.values["custrecord_ptg_status_sgc_2_"].value;
            var tipoDeServicio = objValue.values["custrecord_ptg_tipodeservicio_2_"].value;
            var folioUnidad = objValue.values["custrecord_ptg_foliounidad_sgc_2_"];
            var totalizadorInicialSGC = objValue.values["custrecord_ptg_totalizador_inicia_sgc_2"];
            var totalizadorFinalSGC = objValue.values["custrecord_totalizador_final_sgc_2_"];
            var tipoDePagoSGC = Number(objValue.values["custrecord_ptg_tipo_de_pago_sgc_2_"].value);
            var dispensador = objValue.values["custrecord_ptg_dispensador_2_"];
            var tipoSGC = Number(objValue.values["custrecord_ptg_tipo_sgc_2_"].value);
            log.debug("tipoSGC", tipoSGC);
            log.debug("tipoDePagoSGC", tipoDePagoSGC);
            log.debug("vehiculoDestino", vehiculoDestino);
            log.debug("viajeDestino", viajeDestino);
            log.debug("folio", folio);
            log.debug("rutaConciliar", rutaConciliar);
            var rfcGenerico = "";
            var rfcPublicoGeneral = "";
            var condretado = 0;
            var entregado = 0;
            var ventaLitro = 0;
            var traspasoId = 0;
            var formularioRecepcion = 0;
            var formularioOportunidad = 0;
            var formularioOrdenTraslado = 0;
            var publicoGeneralID = 0;
            var idArticuloDescuento = 0;

            if (runtime.envType === runtime.EnvType.SANDBOX) {
                rfcGenerico = "XAXX010101000";
                rfcPublicoGeneral = "JES900109Q90";
                condretado = 13;
                entregado = 3;
                ventaLitro = 9;
                traspasoId = 25;
                formularioRecepcion = 258;
                formularioOportunidad = 305;
                formularioOrdenTraslado = 313;
                publicoGeneralID = 27041;
                idArticuloDescuento = 4217;
            } else if (runtime.envType === runtime.EnvType.PRODUCTION) {
                rfcGenerico = "XAXX010101000";
                rfcPublicoGeneral = "JES900109Q90";
                condretado = 13;
                entregado = 3;
                ventaLitro = 9;
                traspasoId = 25;
                formularioRecepcion = 270;
                formularioOportunidad = 265;
                formularioOrdenTraslado = 266;
                publicoGeneralID = 27041;
                idArticuloDescuento = 4217;
            }


            var clienteObj = record.load({
                type: search.Type.CUSTOMER,
                id: cliente
            });
            var rfc = clienteObj.getValue("custentity_mx_rfc");
            var clienteDescuento = false;
            var descuentoPeso = parseFloat(clienteObj.getValue("custentity_ptg_descuento_asignar"));
            if(descuentoPeso > 0){
                clienteDescuento = true;
            }
            var descuentoSinIVA = descuentoPeso / 1.16;
            var descuentoUnitario = (cantidad * descuentoSinIVA) * -1;
            log.audit("Cliente: "+ cliente, "RFC ", rfc);
            var nombreClienteAFacturar = clienteObj.getValue("custentity_razon_social_para_facturar");
            if((rfc != rfcGenerico) || (rfc != rfcPublicoGeneral)){
                log.audit("Solicita factura");
                solicitaFactura = true;
            }
            
            
            var numeroViaje = runtime.getCurrentScript().getParameter({
                name: 'custscript_drt_ptg_num_viaje_serv_est'
            }) || '';
            var vehiculo = runtime.getCurrentScript().getParameter({
                name: 'custscript_drt_ptg_vehiculo_serv_est'
            }) || '';

            if(rutaConciliar){
                log.debug('INFO', 'Es un registro a conciliar');
                objPagos = {
                    metodo_txt: formaPagoTXT,
                    tipo_pago: formaPago,
                    monto: montoPago,
                    folio: referencia,
                };
                arrayPagos.push(objPagos);
                objPagosOportunidad = { pago: arrayPagos };
                var objValue = JSON.stringify(objPagosOportunidad);


                if(cliente != publicoGeneralID){// Cuando tiene un cliente distinto a público general, trata de buscar una opp para actualizar
                    log.debug('INFO', 'Cuando tiene un cliente distinto a público general, trata de buscar una opp para actualizar');
                    var oportunidadID = null;
                    var location_id = planta;
                    var num_ruta = rutaConciliar;
                    var customrecord_ptg_tabladeviaje_enc2_Search = search.create({
                        type: "customrecord_ptg_tabladeviaje_enc2_",
                        filters: [
                            ["custrecord_ptg_vehiculo_tabladeviajes_.internalidnumber", "equalto", num_ruta], "AND",
                            ["custrecord_ptg_id_vehiculo_sgc", "isnotempty", ""]
                        ],
                        columns: [
                            "custrecord_ptg_id_vehiculo_sgc"
                        ]
                    });
                    var searchResultCountNumRuta = customrecord_ptg_tabladeviaje_enc2_Search.runPaged().count;
                    log.debug("Búsqueda por número de ruta para encontrar id_vehiculo result count", searchResultCountNumRuta);
                    
                    //  Sólo si hay un viaje activo con este número de vehículo, se procede a validar la búsqueda de una oportunidad
                    if (searchResultCountNumRuta > 0) {
                        log.debug('INFO', 'Sólo si hay un viaje activo con este número de vehículo, se procede a validar la búsqueda de una oportunidad');
                        var customrecord_ptg_equiposSearchResult = customrecord_ptg_tabladeviaje_enc2_Search.run().getRange({ start: 0, end: searchResultCountNumRuta });
                        var id_vehiculo = customrecord_ptg_equiposSearchResult[0].getValue({ name: "custrecord_ptg_id_vehiculo_sgc" });
                        var litros = cantidad;
                        var total = precio;

                        log.audit({
                            title: 'Buscando por variables:',
                            details: `Buscando por planta: ${location_id} vehículo: ${id_vehiculo} Cliente: ${cliente} Litros: ${litros} Total: ${total}`
                        })

                        if ( tipoSGC == 1 ) {// SGC web
                            log.debug('INFO', 'Se busca una oportunidad para SGC WEB con una ruta en específico');
                            var oppSearchArr = [];
                            var opportunitySearchObj = search.create({
                                type: "opportunity",
                                filters: [
                                    ["entitystatus","anyof","11"], "AND", 
                                    ["custbody_ptg_estado_pedido","anyof","2"], "AND", 
                                    ["custbody_ptg_planta_relacionada","anyof",location_id], "AND", 
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_vehiculo_tabladeviajes_","anyof",num_ruta], "AND", 
                                    ["customer.internalid","anyof",cliente]
                                ],
                                columns: [
                                    search.createColumn({name: "title", label: "Título"}),
                                    search.createColumn({name: "tranid", sort: search.Sort.DESC, label: "Número de documento"}),
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
                                    search.createColumn({name: "custrecord_ptg_vehiculo_tabladeviajes_", join: "CUSTBODY_PTG_NUMERO_VIAJE", label: "PTG - Vehiculo (Tabla de Viajes)"}),
                                    search.createColumn({name: "custrecord_ptg_id_vehiculo_sgc", join: "CUSTBODY_PTG_NUMERO_VIAJE", label: "PTG - ID VEHICULO SGC"})
                                ]
                            });
                            var searchResultCount = opportunitySearchObj.runPaged().count;
                            log.debug("opportunitySearchObj sgc web result count",searchResultCount);
                            opportunitySearchObj.run().each(function(result){
                                var values = result.getAllValues();
                                // log.debug('Values busqueda no conciliado', values);
                                var obj = {};
                                obj.id = Number(values.internalid[0].value);
                                oppSearchArr.push(obj);
                                return true;
                            });

                            log.debug('oppSearchArr', oppSearchArr);

                            // Se encontró una oportunidad para actualizar
                            if ( oppSearchArr.length ) {
                                log.debug('INFO', 'Entró a una oportunidad de SGC WEB para actualizar');
                                var folio      = folio;
                                var tipoServ   = tipoDeServicio;
                                var folioUni   = folioUnidad;
                                var totInicial = totalizadorInicialSGC;
                                var totFinal   = totalizadorFinalSGC;
                                var tipoPago   = tipoDePagoSGC;
                                var fechaIni   = fechaInicioSGC;
                                var fechaFin   = fechaFinSGC;

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

                                oppRecord.setValue({fieldId:'entity', value: cliente });
                                oppRecord.setText({fieldId:'custbody_ptg_folio_sgc_', text: folio});
                                oppRecord.setValue({fieldId:"custbody_ptg_opcion_pago_obj", value: objValue});
                                // oppRecord.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: element.fecha_inicio});
                                oppRecord.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: fechaIni});
                                oppRecord.setText({fieldId:'custbody_fecha_final_sgc_', text: fechaFin});
                                // oppRecord.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: moment(fechaIni).format('D/M/YYYY h:mm:ss a')});
                                // oppRecord.setText({fieldId:'custbody_fecha_final_sgc_', text: moment(fechaFin).format('D/M/YYYY h:mm:ss a')});
                                oppRecord.setValue({fieldId:'custbody_ptg_tipodeservicio_', value: tipoDeServicio });
                                oppRecord.setText({fieldId:'custbody_ptg_foliounidad_sgc', text: folioUni});
                                oppRecord.setText({fieldId:'custbody_ptg_totalizador_inicial_sgc', text: totInicial});
                                oppRecord.setText({fieldId:'custbody_totalizador_final_sgc_', text: totFinal});
                                oppRecord.setValue({fieldId:'custbody_ptg_tipo_de_pago_sgc_', value: tipoPago});
                                oppRecord.setValue({fieldId:'custbody_ptg_estado_pedido', value: 3});
                                oppRecord.setValue({fieldId:'entitystatus', value: 13});
                                oppRecord.setValue({fieldId:'custbody_ptg_tipo_sgc', value: tipoSGC});// Se indica que el registro es de SGC web

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

                                //Se agrega la línea de descuento en caso que el cliente tenga descuento
                                if(clienteDescuento){   
                                    oppRecord.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        line: 1,
                                        value: descuentoUnitario ?? 0
                                    });
                                }
            
                                oportunidadID = oppRecord.save();
                            
                                log.debug('INFO', 'Registro actualizado exitósamente por sgc web '+oportunidadID);

                                // Si todo salió bien al crear la nueva oportunidad, se modifica el registro de línea asignarle una oportunidad
                                if( oportunidadId ) {
                                    regServCilUpdate.custrecord_ptg_oportun_reg_serv_est_lin = oportunidadId;
                                    log.debug({
                                        title: "Oportunidad Actualizada",
                                        details: "Id Saved: " + oportunidadId,
                                    });
            
                                    record.submitFields({
                                        id: idRegistroCilindroLinea,
                                        type: "customrecord_ptg_registro_servicios_es_l",
                                        values: regServCilUpdate,
                                    });
            
                                    var objRecordLoad = record.load({
                                        type: record.Type.OPPORTUNITY,
                                        id: oportunidadId,
                                    });
            
                                    var idObjRecordLoad = objRecordLoad.save();
            
                                    log.debug({
                                        title: "Oportunidad Cargada",
                                        details: "Id Saved: " + idObjRecordLoad,
                                    });
                                }
                            } else {
                                log.debug('INFO', 'Error, no encontró ningún servicio de sgc web con este criterio de búsqueda');
                                log.debug('Error', 'No se encontró ningún servicio de sgc web con este criterio de búsqueda');
                            }
                            return;
                        } else {// Sgc local
                            log.debug('INFO', 'Se busca una oportunidad para SGC Local con una ruta en específico');

                            var opportunitySearchObj = search.create({
                                type: "opportunity",
                                filters: [
                                    ["entitystatus", "anyof", "11"], "AND",
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_servicioestacionario_", "is", "T"], "AND",
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_viajeactivo_", "is", "T"], "AND",
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_estatus_tabladeviajes_", "anyof", "3"], "AND",
                                    ["custbody_ptg_planta_relacionada.internalid", "anyof", location_id], "AND",
                                    ["customer.internalid", "is", cliente], "AND",
                                    ["custbody_ptg_numero_viaje.custrecord_ptg_id_vehiculo_sgc", "is", id_vehiculo]
                                ],
                                columns: [
                                    "internalid",
                                    "trandate",
                                    "tranid",
                                    "entity",
                                    "entitystatus",
                                    search.createColumn({name: "custbody_ptg_numero_viaje", sort: search.Sort.DESC}),
                                    search.createColumn({name: "custrecord_ptg_vehiculo_tabladeviajes_", join: "CUSTBODY_PTG_NUMERO_VIAJE"}),
                                    search.createColumn({name: "custrecord_ptg_id_vehiculo_sgc", join: "CUSTBODY_PTG_NUMERO_VIAJE"}),
                                    search.createColumn({name: "internalid", join: "CUSTBODY_PTG_PLANTA_RELACIONADA"})
                                ]
                            });
                            var searchResultCount = opportunitySearchObj.runPaged().count;

                            if (searchResultCount > 0) {
                                try {
                                    var entity_status = 13;
                                    var custbody_ptg_estado_pedido = 3;
                                    var opportunitySearchResult = opportunitySearchObj.run().getRange({ start: 0, end: searchResultCount });
                                    var recOportunidad = record.load({
                                        type: "opportunity",
                                        id: opportunitySearchResult[0].getValue({ name: "internalid" })
                                    });

                                    log.audit('Se actualiza la oportunidad', opportunitySearchResult[0].getValue({ name: "internalid" }));
                                    recOportunidad.setValue({fieldId: "entitystatus", value: entity_status});
                                    recOportunidad.setValue({fieldId:"custbody_ptg_opcion_pago_obj", value: objValue});

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

                                    //Se agrega la línea de descuento en caso que el cliente tenga descuento
                                    if(clienteDescuento){   
                                        recOportunidad.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'rate',
                                            line: 1,
                                            value: descuentoUnitario ?? 0
                                        });
                                    }

                                    oportunidadID = recOportunidad.save();
                                    //oportunidadesAfectadas.push(oportunidadId);
                                    log.debug(`Se actualiza la oportunidad: ${oportunidadID}`);

                                    /*var opportunityRecord = record.load({
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
                                    log.debug("Update Contador", `Updated contador: id: ${oportunidadID} - Contador: ${serviciosNoConciliados}`);*/

                                    // Si todo salió bien al crear la nueva oportunidad, se modifica el registro de línea asignarle una oportunidad
                                    if( oportunidadId ) {
                                        regServCilUpdate.custrecord_ptg_oportun_reg_serv_est_lin = oportunidadID;
                                        log.debug({
                                            title: "Oportunidad Actualizada",
                                            details: "Id Saved: " + oportunidadID,
                                        });
                
                                        record.submitFields({
                                            id: idRegistroCilindroLinea,
                                            type: "customrecord_ptg_registro_servicios_es_l",
                                            values: regServCilUpdate,
                                        });
                
                                        var objRecordLoad = record.load({
                                            type: record.Type.OPPORTUNITY,
                                            id: oportunidadID,
                                        });
                
                                        var idObjRecordLoad = objRecordLoad.save();
                
                                        log.debug({
                                            title: "Oportunidad Cargada",
                                            details: "Id Saved: " + idObjRecordLoad,
                                        });
                                    }
                                } catch (error) {
                                    log.error("Error loading record: ", error);
                                }
                            } else {
                                log.audit('No se encontró oportunidad para el servicio:', servicio_id);
                            }
                        }
                    } else {
                        log.debug('INFO', 'No se encontró el vehículo para el servicio: '+servicio_id);
                        log.audit('No se encontró vehículo para el servicio:', servicio_id);
                    }
                } else {// Crea una oportunidad desde 0
                    log.debug('INFO', 'Crea una oportunidad desde 0');
                    var litrosSurtidos = litrosSurtidos;
                    var totalPorLitro  = precio;
                    var totalCalculado = Number(litrosSurtidos) * Number(totalPorLitro);
                    log.debug('Tipo SGC', tipoSGC );
                    log.debug('litrosSurtidos', litrosSurtidos );
                    log.debug('totalPorLitro', totalPorLitro );
                    log.debug('totalCalculado', totalCalculado );
                    // log.debug('Fecha inicio SGC value', sinConciliar.getValue({fieldId:'custrecord_ptg_fechainicio_sgc'}) );
                    var customform = 265;
                    var cliente = cliente;
                    var cantidad = cantidad;
                    var total = precio;
                    //var idRegistro = data.idInterno;
                    var plantaRelaciona = planta;
                    
                    var ruta = rutaConciliar;
                    
                    var calculo = ( tipoSGC == 1 ? ( Number(litrosSurtidos) * Number(totalPorLitro) ): (total * cantidad) * 1.16 );
                    
                    log.audit('calculo', calculo);
                    
                    var arregloPrecio = {"pago":[{"metodo_txt":formaPagoTXT,"tipo_pago":formaPago,"tipo_cuenta":"","tipo_tarjeta":"","monto":calculo,"folio":""}]};
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
                            filters: [
                               ["custrecord_ptg_vehiculo_tabladeviajes_","anyof", ruta], "AND", 
                               ["custrecord_ptg_viajeactivo_","is","T"], "AND",
                               ["custrecord_ptg_estatus_tabladeviajes_","anyof", "3"]
                            ],
                            columns: [
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
        
                    if ( tipoSGC == 1 ) {// SGC WEB
                        var folio      = folio;
                        var tipoServ   = tipoDeServicio;
                        var folioUni   = folioUnidad;
                        var totInicial = totalizadorInicialSGC;
                        var totFinal   = totalizadorFinalSGC;
                        var tipoPago   = tipoDePagoSGC;
                        var fechaIni   = fechaInicioSGC;
                        var fechaFin   = fechaFinSGC;
        
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
                        // newOportunidad.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: moment(fechaIni).format('D/M/YYYY h:mm:ss a')});
                        // newOportunidad.setText({fieldId:'custbody_fecha_final_sgc_', text: moment(fechaFin).format('D/M/YYYY h:mm:ss a')});
                        newOportunidad.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: fechaIni});
                        newOportunidad.setText({fieldId:'custbody_fecha_final_sgc_', text: fechaFin});
                        // newOportunidad.setText({fieldId:'custbody_fecha_final_sgc_', text: element.fecha_fin});
                        // newOportunidad.setValue({fieldId:'custbody_ptg_status_sgc_', value: values.vendedor });
                        newOportunidad.setValue({fieldId:'custbody_ptg_tipodeservicio_', value: tipoServ });
                        newOportunidad.setText({fieldId:'custbody_ptg_foliounidad_sgc', text: folioUni});
                        newOportunidad.setText({fieldId:'custbody_ptg_totalizador_inicial_sgc', text: totInicial});
                        newOportunidad.setText({fieldId:'custbody_totalizador_final_sgc_', text: totFinal});
                        newOportunidad.setValue({fieldId:'custbody_ptg_tipo_de_pago_sgc_', value: tipoPago});
                        newOportunidad.setValue({fieldId:'custbody_ptg_tipo_sgc', value: tipoSGC});// Se indica que el registro es de SGC web
                        
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

                        //Se agrega la línea de descuento en caso que el cliente tenga descuento
                        if(clienteDescuento){  
                            newOportunidad.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: 1,
                                value: idArticuloDescuento
                            });

                            newOportunidad.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                line: 1,
                                value: descuentoUnitario ?? 0
                            });
                        }
        
                        var oportunidadId = newOportunidad.save();
        
                        log.debug('Info', 'Opotunidad guardada exitósamente: '+oportunidadId);
        
                    } else {// SGC LOCAL
                        newOportunidad.setValue({fieldId: 'customform', value: customform});
                        newOportunidad.setValue({fieldId: 'custbody_ptg_tipo_servicio', value: tipo_servicio});
                        newOportunidad.setValue({fieldId: 'currency', value: currency});
                        newOportunidad.setValue({fieldId: 'entity',value: cliente});
                        newOportunidad.setValue({fieldId: 'entitystatus', value: entity_status});
                        newOportunidad.setValue({fieldId: "custbody_ptg_estado_pedido", value: 3});    
                        newOportunidad.setValue({fieldId: "custbody_ptg_planta_relacionada", value: plantaRelaciona});    
                        newOportunidad.setValue({fieldId: "custbody_ptg_numero_viaje", value: viajeActivoId});    
                        //newOportunidad.setValue({fieldId: "custbody_ptg_numero_vehiculo", value: vehiculo});    
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

                        //Se agrega la línea de descuento en caso que el cliente tenga descuento
                        if(clienteDescuento){  
                            newOportunidad.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: 1,
                                value: idArticuloDescuento
                            });

                            newOportunidad.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                line: 1,
                                value: descuentoUnitario ?? 0
                            });
                        }
            
                        oportunidadId = newOportunidad.save();
            
                        log.audit('oportunidadId', oportunidadId);

                    // Si todo salió bien al crear la nueva oportunidad, se modifica el registro de línea asignarle una oportunidad
                    if( oportunidadId ) {
                        regServCilUpdate.custrecord_ptg_oportun_reg_serv_est_lin = oportunidadId;
                        log.debug({
                            title: "Oportunidad Creada",
                            details: "Id Saved: " + oportunidadId,
                        });
    
                        record.submitFields({
                            id: idRegistroCilindroLinea,
                            type: "customrecord_ptg_registro_servicios_es_l",
                            values: regServCilUpdate,
                        });
    
                        var objRecordLoad = record.load({
                            type: record.Type.OPPORTUNITY,
                            id: oportunidadId,
                        });
    
                        var idObjRecordLoad = objRecordLoad.save();
    
                        log.debug({
                            title: "Oportunidad Cargada",
                            details: "Id Saved: " + idObjRecordLoad,
                        });
                    }
                    }
        
                    
                }
            } else {
                if (formaPago != traspasoId) {
                    log.audit("entra oportunidad");
    
                   
                        objPagos = {
                            metodo_txt: formaPagoTXT,
                            tipo_pago: formaPago,
                            monto: montoPago,
                            folio: referencia,
                        };
                        arrayPagos.push(objPagos);
                        objPagosOportunidad = { pago: arrayPagos };
                        var objValue = JSON.stringify(objPagosOportunidad);
    
                        var recOportunidad = record.create({
                            type: record.Type.OPPORTUNITY,
                            isDynamic: true,
                        });
                        recOportunidad.setValue("customform", formularioOportunidad);
                        recOportunidad.setValue("entity", cliente);
                        recOportunidad.setValue("entitystatus", condretado);
                        recOportunidad.setValue("probability", 100);
                        recOportunidad.setValue("custbody_ptg_numero_viaje", numeroViaje);
                        recOportunidad.setValue("custbody_ptg_estado_pedido", entregado);
                        recOportunidad.setValue("custbody_ptg_opcion_pago_obj", objValue);
                        recOportunidad.setValue("custbody_ptg_codigo_movimiento",ventaLitro);
                        recOportunidad.setValue("custbody_ptg_zonadeprecioop_", zonaPrecio);
                        recOportunidad.setValue("custbody_ptg_cliente_solicita_factura", solicitaFactura);
                        recOportunidad.setValue("custbody_razon_social_para_facturar", nombreClienteAFacturar);
                        for (var i = 0; i < 1; i++) {
                            recOportunidad.selectLine("item", i);
                            recOportunidad.setCurrentSublistValue("item", "item", articulo);
                            recOportunidad.setCurrentSublistValue("item", "quantity", cantidad);
                            recOportunidad.setCurrentSublistValue("item", "rate", precio);
                            recOportunidad.commitLine("item");
                        }
                        //Se agrega la línea de descuento en caso que el cliente tenga descuento
                        if(clienteDescuento){
                            for (var i = 1; i < 2; i++) {
                                recOportunidad.selectLine("item", i);
                                recOportunidad.setCurrentSublistValue("item", "item", idArticuloDescuento);
                                recOportunidad.setCurrentSublistValue("item", "rate", descuentoUnitario);
                                recOportunidad.commitLine("item");
                            }
                        }
                        var recOportunidadIdSaved = recOportunidad.save();
                        regServCilUpdate.custrecord_ptg_oportun_reg_serv_est_lin = recOportunidadIdSaved;
                        log.debug({
                            title: "Oportunidad Creada",
                            details: "Id Saved: " + recOportunidadIdSaved,
                        });
    
                        record.submitFields({
                            id: idRegistroCilindroLinea,
                            type: "customrecord_ptg_registro_servicios_es_l",
                            values: regServCilUpdate,
                        });
    
                        var objRecordLoad = record.load({
                            type: record.Type.OPPORTUNITY,
                            id: recOportunidadIdSaved,
                        });
    
                        var idObjRecordLoad = objRecordLoad.save();
    
                        log.debug({
                            title: "Oportunidad Cargada",
                            details: "Id Saved: " + idObjRecordLoad,
                        });
                } else {
    
                    var vehiculoObj = record.load({
                        type: "customrecord_ptg_equipos",
                        id: vehiculo,
                    });
    
                    var subsidiary = vehiculoObj.getValue("custrecord_ptg_subsidiaria_1");
                    var parent = vehiculoObj.getValue("custrecord_ptg_ubicacionruta_");
                    var ruta = 0;
    
                    if(vehiculoDestino){
                        var vehiculoDestinoObj = record.load({
                            type: "customrecord_ptg_equipos",
                            id: vehiculoDestino,
                        });
        
                        ruta = vehiculoDestinoObj.getValue("custrecord_ptg_ubicacionruta_");
                    } else {
                        ruta = estacionCarburacion;
                    }
                    
    
                    var recOrdenTraslado = record.create({
                        type: "transferorder",
                        isDynamic: true,
                    });
            
                    recOrdenTraslado.setValue("customform", formularioOrdenTraslado);
                    recOrdenTraslado.setValue("subsidiary", subsidiary);
                    recOrdenTraslado.setValue("location", parent);
                    recOrdenTraslado.setValue("transferlocation", ruta);
                    recOrdenTraslado.setValue("custbody_ptg_numero_viaje", numeroViaje);
                    if(viajeDestino){
                        recOrdenTraslado.setValue("custbody_ptg_numero_viaje_destino", viajeDestino);
                    }
            
                    for (var i = 0; i < 1; i++) {
                      recOrdenTraslado.selectLine("item", i);
                      recOrdenTraslado.setCurrentSublistValue("item", "item", articulo);
                      recOrdenTraslado.setCurrentSublistValue("item", "quantity", cantidad);
                      recOrdenTraslado.commitLine("item");
                    }
            
                    var idOrdenTraslado = recOrdenTraslado.save();
                    log.debug("idOrdenTraslado", idOrdenTraslado);
    
                    if (idOrdenTraslado) {
                        var newRecordItemFulfillment = record.transform({
                          fromType: record.Type.TRANSFER_ORDER,
                          fromId: idOrdenTraslado,
                          toType: record.Type.ITEM_FULFILLMENT,
                          isDynamic: true,
                          ignoreMandatoryFields: true,
                        });
                        newRecordItemFulfillment.setValue("shipstatus", "C");
            
                        var idItemFulfillment = newRecordItemFulfillment.save({
                          enableSourcing: false,
                          ignoreMandatoryFields: true,
                        }) || "";
            
                        log.debug("idItemFulfillment", idItemFulfillment);
    
                        var objRecordOrdenTrasladoLoad = record.load({
                            type: record.Type.TRANSFER_ORDER,
                            id: idOrdenTraslado,
                        });
    
                        var idObjRecordOrdenTrasladoLoad = objRecordOrdenTrasladoLoad.save();
    
                        log.debug({
                            title: "Orden de Traslado Cargada",
                            details: "Id Saved: " + idObjRecordOrdenTrasladoLoad,
                        });
            
                    }
            
                    if (idItemFulfillment) {
                        var newRecordItemReceipt = record.transform({
                          fromType: record.Type.TRANSFER_ORDER,
                          fromId: idOrdenTraslado,
                          toType: record.Type.ITEM_RECEIPT,
                          isDynamic: true,
                          ignoreMandatoryFields: true,
                        });
                        newRecordItemReceipt.setValue("customform", formularioRecepcion);//PTG- Recepción Orden de Traslado
            
                        newRecordItemReceipt.setValue("location", ruta);
            
                        var idItemReceipt = newRecordItemReceipt.save({
                          enableSourcing: false,
                          ignoreMandatoryFields: true,
                        }) || "";
            
                        log.debug("idItemReceipt", idItemReceipt);
        
                        regServCilUpdate.custrecord_ptg_transa_reg_serv_est_lin = idOrdenTraslado;
    
                        record.submitFields({
                            id: idRegistroCilindroLinea,
                            type: "customrecord_ptg_registro_servicios_es_l",
                            values: regServCilUpdate,
                        });
    
                    }
    
                    if (idItemReceipt) {
                        var objRecordRecepcionLoad = record.load({
                            type: record.Type.ITEM_RECEIPT,
                            id: idItemReceipt,
                        });
    
                        var idObjRecordRecepcionLoad = objRecordRecepcionLoad.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                          }) || "";
    
                        log.debug({
                            title: "Recepcion Cargada",
                            details: "Id Saved: " + idObjRecordRecepcionLoad,
                        });
    
                    }
                }
            }

            
            

            context.write({
                key: recOportunidadIdSaved,
                value: recOportunidadIdSaved
            });
               
        } catch (error) {
            log.debug('Error en el map', error);
            log.error({
                title: 'error map',
                details: JSON.stringify(error)
            });
        }
    }

    function reduce(context) {
        try {
            log.audit({
                title: 'context reduce',
                details: JSON.stringify(context)
            });
            var idOportunidad = JSON.parse(context.key);
            log.audit("idOportunidad", idOportunidad);
            
			
        } catch (error) {
            log.error({
                title: 'error reduce',
                details: JSON.stringify(error)
            });
        }
    }

    function summarize(context) {
        try {
            log.audit({
                title: 'context summarize',
                details: JSON.stringify(context)
            });            
			
        } catch (error) {
            log.error({
                title: 'error summarize',
                details: JSON.stringify(error)
            });
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});