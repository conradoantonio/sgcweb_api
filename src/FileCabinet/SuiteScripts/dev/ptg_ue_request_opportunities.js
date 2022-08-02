/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/file', 'N/http', 'N/record', 'N/search', 'N/xml', 'N/format'],
    /**
 * @param{file} file
 * @param{http} http
 * @param{record} record
 * @param{search} search
 * @param{xml} xml
 */
    (file, http, record, search, xml, format) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            try {
                let idToken = login();
                let gasLpId = "4088";
                let statusAsignadoId = "2";
                let rowItem = scriptContext.newRecord;

                if ( scriptContext.type === scriptContext.UserEventType.EDIT ) {
                    /* Sólo si la oportunidad contiene un artículo de GAS LP, cuenta con un status de asignado 
                    * y tiene una ruta (vehiculo) asignada es que puede guardar/enviar un pedido en SGC web
                    */
                    let statusOpp = rowItem.getValue({fieldId:'custbody_ptg_estado_pedido'});
                    let articulos = searchArticlesOpp(rowItem);
                    let extraInfo = getOppInfo(rowItem);
                    let addressId = rowItem.getValue({fieldId:'shipaddresslist'});
                    let zonaPrecio = rowItem.getText({fieldId:'custbody_ptg_zonadeprecioop_'});
                    // log.debug('Address ID', addressId);
                    // log.debug('articulos', articulos);
                    // log.debug('statusOpp', statusOpp);
                    // log.debug('zonaPrecio', zonaPrecio);
                    // log.debug('extraInfo', extraInfo);
                    // log.debug('Rowitem', rowItem);
                    // return;
                    if ( articulos.length && articulos[0].id == gasLpId && statusOpp == statusAsignadoId && extraInfo.vehiculo ) {
                        let typeModule = action = responseOpp = responseProduct = '';
                       
                        let internalFileId = searchXmlFile(search);
                        let xmlContent = file.load({ id: internalFileId }).getContents();
                        
                        let dataProduct = setDataProduct(rowItem, articulos, zonaPrecio);
                        log.debug('DataProduct', dataProduct);
                        typeModule = "Productos";
                        action = "registrar";
                        responseProduct = registerSgcData(xmlContent, idToken, typeModule, action, dataProduct);

                        if (["1111", "0000"].includes(responseProduct.code[0].textContent) ) {
                            log.debug('SGC', 'Producto registrado correctamente');
                            
                            let dataOpp = setDataOpportunity(rowItem, dataProduct.identificador_externo, articulos, addressId);
                            typeModule = "Pedidos";
                            action = "registrar";
                            responseOpp = registerSgcData(xmlContent, idToken, typeModule, action, dataOpp);
                            
                            log.debug('Response info', responseOpp);
        
                            // Se validará que haya salido bien el response
                            if (["1111", "0000"].includes(responseOpp.code[0].textContent) ) {
                                log.debug('Response code info', responseOpp.code[0]);
                                
                                log.debug('SGC', 'Pedido registrado correctamente');
                                let realResult = JSON.parse(responseOpp.info[0].textContent);
                                log.debug('Respuesta sgcweb pedido', realResult);
                                // log.debug('Respuesta oficial sgcweb', responseOpp.info[0]);
                                
                                // let realResult = JSON.parse(responseOpp.info[0].textContent);
                                // log.debug('Respuesta decodificada', realResult);
                                
                                // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                                record.submitFields({
                                    type: record.Type.OPPORTUNITY,
                                    id: rowItem.id,
                                    values: {
                                        'custbody_ptg_folio_sgc_': realResult.folio
                                        // 'custbody_ptg_folio_aut': realResult.folio
                                    }
                                });
                                log.debug('Actualización', 'Folio de pedido actualizado');
                            } else {
                                log.debug('Ocurrió un error al guardar el pedido en sgc', responseOpp.code[0].textContent);
                            }

                        } else {
                            log.debug('Error', 'El producto no pudo ser actualizado en sgc');
                        }
                    } else {
                        log.debug('Validación', 'No se envía a SGC');
                    }
                } 
            } catch (error) {
                log.debug('Algo salió mal', error);
            }
        }

        // Try to login 
        const login = () => {
            let res;
            
            let fileSearchObj = search.create({
                type: "file",
                filters:
                    [
                        ["name", "haskeywords", "login"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({ name: "folder", label: "Folder" }),
                        search.createColumn({ name: "documentsize", label: "Size (KB)" }),
                        search.createColumn({ name: "url", label: "URL" }),
                        search.createColumn({ name: "created", label: "Date Created" }),
                        search.createColumn({ name: "modified", label: "Last Modified" }),
                        search.createColumn({ name: "filetype", label: "Type" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });
            
            // let searchResultCount = fileSearchObj.runPaged().count;
            // log.debug("fileSearchObj result count", searchResultCount);
            fileSearchObj.run().each(function (result) {
                // log.debug('Resultado petición', result);
                // .run().each has a limit of 4,000 results
                res = result.getValue({ name: "internalid", label: "Internal ID" });
                return true;
            });

            let xmlContent = file.load({ id: res }).getContents();
            // log.debug('xmlContent', xmlContent);

            let headers = {};
            headers['Content-Type'] = 'text/xml; charset=utf-8';
            headers['SOAPAction'] = 'http://testpotogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/login';
            let url = 'http://testpotogas.sgcweb.com.mx//ws/1094AEV2/v2/soap.php';
            // Method, url, body, headers
            let response = http.request({ method: http.Method.POST, url: url, body: xmlContent, headers: headers });
            // log.debug('response', response.body)
            let xmlFileContent = response.body;
            let xmlDocument = xml.Parser.fromString({ text: xmlFileContent });
            let dataJson = xmlDocument.getElementsByTagName({ tagName: 'id' });
            // log.debug('response status login', dataJson);
            let objResult = dataJson[0].textContent;
            // log.debug('objResult login', objResult);
            return objResult;

        }

        // Busqueda guardada para obtener el archivo xml de peticiones a la api de SGC web
        const searchXmlFile = () => {
            let internalFileId;
            let fileSearchObj = search.create({
                type: "file",
                filters:
                    [
                        ["name", "haskeywords", "procesarPeticion"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({ name: "folder", label: "Folder" }),
                        search.createColumn({ name: "documentsize", label: "Size (KB)" }),
                        search.createColumn({ name: "url", label: "URL" }),
                        search.createColumn({ name: "created", label: "Date Created" }),
                        search.createColumn({ name: "modified", label: "Last Modified" }),
                        search.createColumn({ name: "filetype", label: "Type" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });
            fileSearchObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                internalFileId = result.getValue({ name: "internalid", label: "Internal ID" });
                return true;
            });

            return internalFileId;
        }

        // Obtiene los artículos de las oportunidades
        const searchArticlesOpp = (rowItem) => {
            let articlesArray = [];

            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                [
                    ["type","anyof","Opprtnty"], 
                    "AND", 
                    ["internalid","anyof",rowItem.id], 
                    "AND", 
                    ["mainline","is","F"], 
                    "AND", 
                    ["taxline","is","F"]
                ],
                columns:
                [
                    search.createColumn({name: "item", label: "Artículo"}),
                    search.createColumn({name: "quantity", label: "Cantidad"}),
                    search.createColumn({name: "rate", label: "Tasa de artículo"}),
                    search.createColumn({name: "fxrate", label: "Tasa de artículo"})
                ]
            });
             
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug("transactionSearchObj result count",searchResultCount);
            transactionSearchObj.run().each(function(result) {
                let resValues = result.getAllValues();
                // log.debug('values', resValues);

                let article = {
                    id       : resValues['item'][0].value,
                    item     : resValues.item[0].text,
                    quantity : resValues['quantity'],
                    rate     : resValues['rate'],
                };

                articlesArray.push(article);

                // .run().each has a limit of 4,000 results
                return true;
             });

             return articlesArray;
        }
        
        // Obtiene información adicional de la oportunidad (vehículo, zona de precio, costo de del producto)
        const getOppInfo = (rowItem) => {
            let obj = {};

            var opportunitySearchObj = search.create({
                type: "opportunity",
                filters:
                [
                //    ["custbody_ptg_estado_pedido","anyof","2"], 
                //    "AND", 
                    ["internalid","anyof",rowItem.id], 
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
                    search.createColumn({name: "custbody_ptg_numero_viaje", label: "Número de Viaje"}),
                    search.createColumn({name: "custbody_ptg_ruta_asignada", label: "PTG - RUTA ASIGNADA"}),
                    search.createColumn({name: "custbody_ptg_precio_articulo_zona", label: "PTG - PRECIO DEL ARICULO EN LA ZONA"}),
                    search.createColumn({name: "custbody_ptg_zonadeprecioop_", label: "PTG - Zona de precio Oportuidad"}),
                    search.createColumn({name: "custbody_ptg_folio_aut", label: "PTG - FOLIO DE AUTORIZACIÓN"}),
                    search.createColumn({name: "custbody_ptg_folio_sgc_", label: "PTG - Folio SGC"}),
                    search.createColumn({
                        name: "custrecord_ptg_vehiculo_tabladeviajes_",
                        join: "CUSTBODY_PTG_NUMERO_VIAJE",
                        label: "PTG - Vehiculo (Tabla de Viajes)"
                    })
                ]
             });
            var searchResultCount = opportunitySearchObj.runPaged().count;
            log.debug("opportunitySearchObj result count",searchResultCount);
            opportunitySearchObj.run().each(function(result) {
                let resValues = result.getAllValues();
                // log.debug('values', resValues);

                obj = {
                    folioSgc       : resValues.custbody_ptg_folio_sgc_,
                    numViaje       : resValues.custbody_ptg_numero_viaje[0].text,
                    precioProducto : resValues.custbody_ptg_precio_articulo_zona,
                    vehiculo       : resValues['CUSTBODY_PTG_NUMERO_VIAJE.custrecord_ptg_vehiculo_tabladeviajes_'][0].text,
                };

                // .run().each has a limit of 4,000 results
                return true;
            });
             
            return obj;
        }

        // Configura los datos a enviar para el producto
        const setDataProduct = (rowPedido, articulos, zonaPrecio) => {
            // let tipo_pago = ( type == 'edit' ? rowPedido.getValue({fieldId: 'custentity_ptg_alianza_comercial_cliente'}) : rowPedido.getValue({fieldId:'custentity_ptg_alianza_comercial_cliente'}) );
            let artGLP = articulos[0];
            let artDescuento = articulos[1] ? articulos[1] : null;
            let precioSinImpuesto = 0.00;
            let precioVenta = 0.00;
            
            precioSinImpuesto = Number(parseFloat(artGLP.rate).toFixed(2));
            precioVenta       = Number(parseFloat(precioSinImpuesto * 1.16).toFixed(2));

            let data = {
                "nombre":"GAS LP "+zonaPrecio,
                "identificador_externo":zonaPrecio,
                "monto_costo_unitario":0.00,
                "precio_sin_impuesto":precioSinImpuesto,
                "precio_venta":precioVenta,
                "tasa_impuesto":16.00,
                "unidad_medida":"Litro",
                "activo":1,
                "lista_descuentos":""
             };

            // log.debug('json producto', data);

            return data;
        }

        // Configura los datos a enviar del producto a SGC web
        const setDataOpportunity = (rowItem, productoId, articulos, direccionId) => {

            let fechaCreacion = horaCreacion = fechaDividida = horaDividida = horaMinDividida = fechaAtencion = anio = mes = dia = hora = min = isPm = horaMin = '';
            let trandate          = rowItem.getValue({fieldId:'trandate'});
            let comentarios       = rowItem.getValue({fieldId:'memo'});
            // let estatus           = ( type == 'edit' ? rowItem.getValue({fieldId:'entitystatus'}) : rowItem.getValue({fieldId:'entitystatus'}) );
            // let rutaId            = ( type == 'edit' ? rowItem.getValue({fieldId:'custbody_route'}) : rowItem.getValue({fieldId:'custbody_route'}) );
            let motivoCancelacion = rowItem.getText({fieldId:'custbody_ptg_motivo_cancelation'});
            let entity            = rowItem.getValue({fieldId:'entity'});

            if ( trandate ) {
                var formattedDateString = format.format({
                    value: trandate,
                    type: format.Type.DATETIME,
                    timezone: format.Timezone.AMERICA_MEXICO_CITY
                });
    
                trandate = formattedDateString.split(' ');
                fechaCreacion = trandate[0];
                horaCreacion = trandate[1];
            }

            if ( fechaCreacion ) {
                fechaDividida = fechaCreacion.split('/');
                dia  = fechaDividida[0];
                mes  = fechaDividida[1];
                anio = fechaDividida[2];

                if ( mes < 10 ) { mes = '0'.concat(mes); }

                fechaAtencion = anio+'-'+mes+'-'+dia;
            }

            if ( horaCreacion ) {
                horaDividida = horaCreacion.split(' ');
                horaMin      = horaDividida[0];
                isPm         = horaDividida[1];
                
                horaMinDividida = horaMin.split(':');
                hora = horaMinDividida[0];
                min  = horaMinDividida[1];

                if ( hora < 10 ) { hora = '0'.concat(hora); }
                fechaAtencion += ' '+hora+':'+min+':00';
            }

            let data = {
                // "folio":"",
                "identificador_externo": rowItem.id,
                "fecha_atencion":fechaAtencion,
                "fecha_servicio":"",
                "fecha_modificacion":"",
                "estatus":"",
                "comentarios":comentarios,
                "cantidad":articulos.length ? articulos[0].quantity : 0,
                // "producto_id":'GAS-LP-202',
                "producto_id":productoId,
                "precio_id":"",
                "usuario_asignado_id":"",
                "consumidor_id":"0000".concat(direccionId),
                "lista_unidades_id":"",
                "ruta_id":"2051",
                // "ruta_id":rutaId,
                "motivo_cancelacion":motivoCancelacion,
            };

            log.debug('data oportunidad armada: ', data);

            return data;
        }

        // Guarda / actualiza un producto en SGC web
        const registerSgcData = (xmlContent, idToken, typeModule, action, data) => {
            xmlContent = xmlContent.split('idSession').join(`${idToken}`);
            xmlContent = xmlContent.split('typeModule').join(`${typeModule}`);
            xmlContent = xmlContent.split('action').join(`${action}`);
            xmlContent = xmlContent.split('data').join(`${JSON.stringify(data)}`);

            let headers = {};
            headers['Content-Type'] = 'text/xml; charset=utf-8';
            headers['SOAPAction'] = 'http://testpotogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/procesarPeticion';
            let url = 'http://testpotogas.sgcweb.com.mx//ws/1094AEV2/v2/soap.php';
            let response = http.request({ method: http.Method.POST, url: url, body: xmlContent, headers: headers });                    
            let xmlFileContent = response.body;
            let xmlDocument = xml.Parser.fromString({ text: xmlFileContent });
            let info = xmlDocument.getElementsByTagName({ tagName: 'informacion' });
            let responseCode = xmlDocument.getElementsByTagName({ tagName: 'codigo' });

            return {
                info : info,
                code : responseCode,
            };
            
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
