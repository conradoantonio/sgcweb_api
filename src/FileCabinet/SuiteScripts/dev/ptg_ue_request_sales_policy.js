/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/file', 'N/http', 'N/https', 'N/record', 'N/search', 'N/xml'],
    /**
 * @param{file} file
 * @param{http} http
 * @param{https} https
 * @param{record} record
 * @param{search} search
 * @param{xml} xml
 */
    (file, http, https, record, search, xml) => {
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

                if ( scriptContext.type === scriptContext.UserEventType.EDIT ) {
                    let record = scriptContext.newRecord;// Get edited customer
                    log.debug('Info', 'Edición de políticas');
                    // log.debug('Record', record);
                    let tipoPago = ( record.getText({fieldId:'custrecord_ptg_metodo_de_pago_pv'}) == 'Contado' ? 1 : 2);

                    let res;
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
                    // let searchResultCount = fileSearchObj.runPaged().count;
                    // log.debug("fileSearchObj result count", searchResultCount);
                    fileSearchObj.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        res = result.getValue({ name: "internalid", label: "Internal ID" });
                        return true;
                    });

                    let xmlContent = file.load({ id: res }).getContents();
                    // log.debug('xmlContent ', xmlContent);
                    // log.debug('ID cliente', scriptContext.newRecord.id);
                    let typeModule = "PoliticasVenta";
                    let action = "registrar";
                    let data = {
                        "nombre":record.getText({fieldId:'name'}),
                        "identificador_externo":record.id,
                        "activa":( record.getValue({fieldId:'isinactive'}) == "F" ? 1 : 0),
                        "tipo_pago":tipoPago,
                        "limite_credito":record.getValue({fieldId:'custrecord_ptg_limitedecredito_pv'}),
                        "numero_semanas_credito":"1",
                        "frecuencia_factura":record.getText({fieldId:'custrecord_ptg_frecuenciadelafactura_pv'}),
                        "facturar_todos_servicios":0,
                        "facturar_servicios_vpg":0,
                        "recordatorio_pago":0,
                        "recordatorio_pago_dias":"",
                        "notificar_limite_credito":0,
                        "bloqueo_morosidad":0
                    };

                    log.debug('data', data);

                    xmlContent = xmlContent.split('idSession').join(`${idToken}`);
                    xmlContent = xmlContent.split('typeModule').join(`${typeModule}`);
                    xmlContent = xmlContent.split('action').join(`${action}`);
                    xmlContent = xmlContent.split('data').join(`${JSON.stringify(data)}`);

                    log.debug('despues del primer join', xmlContent);

                    let headers = {};
                    headers['Content-Type'] = 'text/xml; charset=utf-8';
                    headers['SOAPAction'] = 'http://testpotogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/procesarPeticion';
                    let url = 'http://testpotogas.sgcweb.com.mx//ws/1094AEV2/v2/soap.php';
                    let response = http.request({ method: http.Method.POST, url: url, body: xmlContent, headers: headers });                    
                    // log.debug('response', response.body)
                    let xmlFileContent = response.body;
                    let xmlDocument = xml.Parser.fromString({ text: xmlFileContent });
                    let dataJson = xmlDocument.getElementsByTagName({ tagName: 'informacion' });
                    let responseCode = xmlDocument.getElementsByTagName({ tagName: 'codigo' });
                    log.debug('response info', dataJson);
                    log.debug('response code', responseCode);

                    // Se validará que haya salido bien el response
                    if (["1111", "0000"].includes(responseCode[0].textContent) ) {
                        log.debug('Response code info', 'Todo salió bien');
                    } else {
                        log.debug('Ocurrió un error', responseCode[0].textContent);
                    }
                } 
                else if( scriptContext.type === scriptContext.UserEventType.CREATE ) {
                    let record = scriptContext.newRecord;// Get created customer
                    // log.debug('cliente', record);
                    let tipoPago = ( record.getValue({fieldId:'custrecord_ptg_metodo_de_pago_pv'}) == 'Contado' ? 1 : 2);
                    // let rfcVal = record.getValue({fieldId: 'custentity_mx_rfc'});
                    let res;
                    // log.debug('ID cliente', scriptContext.newRecord.id);

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
                    // let searchResultCount = fileSearchObj.runPaged().count;
                    // log.debug("fileSearchObj result count", searchResultCount);
                    fileSearchObj.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        res = result.getValue({ name: "internalid", label: "Internal ID" });
                        return true;
                    });

                    let xmlContent = file.load({ id: res }).getContents();
                    log.debug('xmlContent ', xmlContent);
                    let typeModule = "PoliticasVenta";
                    let action = "registrar";
                    let data = {
                        "nombre":record.getValue({fieldId:'name'}),
                        "identificador_externo":record.id,
                        "activa":( record.getValue({fieldId:'isinactive'}) == "F" ? 1 : 0),
                        "tipo_pago":tipoPago,
                        "limite_credito":record.getValue({fieldId:'custrecord_ptg_limitedecredito_pv'}),
                        "numero_semanas_credito":"1",
                        "frecuencia_factura":record.getValue({fieldId:'custrecord_ptg_frecuenciadelafactura_pv'}),
                        "facturar_todos_servicios":0,
                        "facturar_servicios_vpg":0,
                        "recordatorio_pago":0,
                        "recordatorio_pago_dias":"",
                        "notificar_limite_credito":0,
                        "bloqueo_morosidad":0
                    };

                    xmlContent = xmlContent.split('idSession').join(`${idToken}`);
                    xmlContent = xmlContent.split('typeModule').join(`${typeModule}`);
                    xmlContent = xmlContent.split('action').join(`${action}`);
                    xmlContent = xmlContent.split('data').join(`${JSON.stringify(data)}`);

                    log.debug('despues del primer join', xmlContent);

                    let headers = {};
                    headers['Content-Type'] = 'text/xml; charset=utf-8';
                    headers['SOAPAction'] = 'http://testpotogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/procesarPeticion';
                    let url = 'http://testpotogas.sgcweb.com.mx//ws/1094AEV2/v2/soap.php';
                    let response = http.request({ method: http.Method.POST, url: url, body: xmlContent, headers: headers });                    
                    log.debug('response', response.body);
                    let xmlFileContent = response.body;
                    let xmlDocument = xml.Parser.fromString({ text: xmlFileContent });
                    let dataJson = xmlDocument.getElementsByTagName({ tagName: 'informacion' });
                    let responseCode = xmlDocument.getElementsByTagName({ tagName: 'codigo' });
                    // log.debug('log después de la llamada a crear registro', '');
                    log.debug('response status', dataJson);

                    // Se validará que haya salido bien el response
                    if (["1111", "0000"].includes(responseCode[0].textContent) ) {
                        log.debug('Response code info', 'Todo salió bien');
                    } else {
                        log.debug('Ocurrió un error', responseCode[0].textContent);
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
            // log.debug('response status', dataJson)
            let objResult = dataJson[0].textContent;
            // log.debug('objResult', objResult)
            return objResult;
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
