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
                // Colocar los objetos como vacíos
                let idToken = login();
                let rowItem = scriptContext.newRecord;

                if( scriptContext.type === scriptContext.UserEventType.CREATE ) {
                    let internalFileId = searchXmlFile(search);
                    let xmlContent = file.load({ id: internalFileId }).getContents();
                    let dataToSend = setDataOpportunity(rowItem, null, 'create');
                    let typeModule = "Pedidos";
                    let action = "registrar";
                    let responseInfo = registerOpp(xmlContent, idToken, typeModule, action, dataToSend);
                    
                    log.debug('Response info', responseInfo);

                    // Se validará que haya salido bien el response
                    if (["1111", "0000"].includes(responseInfo.code[0].textContent) ) {
                        log.debug('Response code info', responseInfo.code[0]);
                        log.debug('Respuesta oficial sgcweb', responseInfo.info[0]);

                        let realResult = JSON.parse(responseInfo.info[0].textContent);
                        log.debug('Respuesta decodificada', realResult);
                        
                        // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                        record.submitFields({
                            type: record.Type.OPPORTUNITY,
                            id: rowItem.id,
                            values: {
                                'custbody_otg_folio_aut': realResult.folio
                            }
                        });
                        log.debug('Actualización', 'Folio de pedido actualizado');
                    } else {
                        log.debug('Ocurrió un error', responseInfo.code[0].textContent);
                    }
                }
                else if ( scriptContext.type === scriptContext.UserEventType.EDIT ) {
                    let internalFileId = searchXmlFile(search);
                    let xmlContent = file.load({ id: internalFileId }).getContents();
                    let dataToSend = setDataOpportunity(rowItem, null, 'edit');
                    let typeModule = "Pedidos";
                    let action = "registrar";
                    let responseInfo = registerOpp(xmlContent, idToken, typeModule, action, dataToSend);
                    
                    log.debug('Response info', responseInfo);

                    // Se validará que haya salido bien el response
                    if (["1111", "0000"].includes(responseInfo.code[0].textContent) ) {
                        log.debug('Response code info', responseInfo.code[0]);
                        log.debug('Respuesta oficial sgcweb', responseInfo.info[0]);
                        
                        let realResult = JSON.parse(responseInfo.info[0].textContent);
                        log.debug('Respuesta decodificada', realResult);
                        
                        // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                        record.submitFields({
                            type: record.Type.OPPORTUNITY,
                            id: rowItem.id,
                            values: {
                                'custbody_otg_folio_aut': realResult.folio
                            }
                        });
                        log.debug('Actualización', 'Folio de pedido actualizado');
                    } else {
                        log.debug('Ocurrió un error', responseInfo.code[0].textContent);
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
        const searchXmlFile = (search) => {
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

        // Configura los datos a enviar del producto a SGC web
        const setDataOpportunity = (rowItem, aditionalCustomerInfo = false, type) => {
            // log.debug('info', 'entró a la función de configurar la información del producto');

            // let nombre            = ( type == 'edit' ? rowItem.getText({fieldId:'name'}) : aditionalCustomerInfo?.name );
            let fechaCreacion = horaCreacion = fechaDividida = horaDividida = horaMinDividida = fechaAtencion = anio = mes = dia = hora = min = isPm = horaMin = '';
            let trandate          = ( type == 'edit' ? rowItem.getValue({fieldId:'trandate'}) : rowItem.getValue({fieldId:'trandate'}) );
            let comentarios       = ( type == 'edit' ? rowItem.getValue({fieldId:'memo'}) : rowItem.getValue({fieldId:'memo'}) );
            // let estatus           = ( type == 'edit' ? rowItem.getValue({fieldId:'entitystatus'}) : rowItem.getValue({fieldId:'entitystatus'}) );
            // let rutaId            = ( type == 'edit' ? rowItem.getValue({fieldId:'custbody_route'}) : rowItem.getValue({fieldId:'custbody_route'}) );
            let motivoCancelacion = ( type == 'edit' ? rowItem.getText({fieldId:'custbody_ptg_motivo_cancelation'}) : rowItem.getValue({fieldId:'custbody_ptg_motivo_cancelation'}) );
            let entity            = ( type == 'edit' ? rowItem.getValue({fieldId:'entity'}) : rowItem.getValue({fieldId:'entity'}) );
            let articulos         = searchArticlesOpp(rowItem);

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
                "cantidad":articulos.length ? articulos[0].quantity : "0",
                "producto_id":articulos.length ? articulos[0].id : "1753",
                "precio_id":"",
                "usuario_asignado_id":"",
                "consumidor_id":entity,
                "lista_unidades_id":"",
                "ruta_id":"2051",
                // "ruta_id":rutaId,
                "motivo_cancelacion":motivoCancelacion,
            };

            log.debug('data armada: ', data);

            return data;
        }

        // Guarda / actualiza un producto en SGC web
        const registerOpp = (xmlContent, idToken, typeModule, action, data) => {
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
