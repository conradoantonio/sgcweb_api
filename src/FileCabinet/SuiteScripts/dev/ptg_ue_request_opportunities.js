/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/file', 'N/http', 'N/record', 'N/search', 'N/xml'],
    /**
 * @param{file} file
 * @param{http} http
 * @param{record} record
 * @param{search} search
 * @param{xml} xml
 */
    (file, http, record, search, xml) => {
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

                if ( scriptContext.type === scriptContext.UserEventType.EDIT ) {
                    let editOpportunity = scriptContext.newRecord;// Get edited customer
                    // let name = editOpportunity.getText({fieldId: 'altname'});
                    // let balance = editOpportunity.getText({fieldId: 'balance'});
                    // let isinactive = editOpportunity.getText({fieldId: 'isinactive'});
                    // let street = editOpportunity.getValue({fieldId : 'custrecord_ptg_street' });

                    // log.debug('Calle', street);
                    log.debug('Registro de oportunidad', editOpportunity);
                    // log.debug('Tiene el id token', idToken);

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
                    let typeModule = "Clientes";
                    let action = "registrar";
                    let data = {
                        // "numero_cliente":"",
                        "identificador_externo": editOpportunity.getText({fieldId:'entityid'}),
                        "fecha_atencion":editOpportunity.getText({fieldId:'companyname'}),
                        // "fecha_servicio":editOpportunity.getText({fieldId:'custentity_mx_rfc'}),
                        // "fecha_modificacion":"Enrique Aguilar",
                        // "estatus":"4212",
                        "comentarios":"43",
                        "cantidad":"AGUA  REAL",
                        "producto_id":"SAN LUIS POTOSI",
                        "precio_id":"",
                        "usuario_asignado_id":"Dato fijo, dejar vacío",
                        "consumidor_id":"SAN LUIS POTOSI",
                        "lista_unidades_id":"31135",
                        "ruta_id":"MEXICO",
                        "motivo_cancelacion":editOpportunity.getText({fieldId:'phone'}),
                    };
                    // Nota: Revisar cuál campo se enviará, si ruta_id o lista_unidades_id

                    xmlContent = xmlContent.split('idSession').join(`${idToken}`);
                    xmlContent = xmlContent.split('typeModule').join(`${typeModule}`);
                    xmlContent = xmlContent.split('action').join(`${action}`);
                    xmlContent = xmlContent.split('data').join(`${JSON.stringify(data)}`);

                    // log.debug('despues del primer join', xmlContent);

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
                    log.debug('response status', dataJson);
                    log.debug('response code', responseCode);
                    let realResult = JSON.parse(dataJson[0].textContent);
                    log.debug('respuesta sgcweb', realResult);

                    // Obtiene el ID del registro recién creado
                    var customerId = scriptContext.newRecord.id;
                    // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                    var otherId = record.submitFields({
                        type: record.Type.CUSTOMER,
                        id: customerId,
                        values: {
                            'comments': 'Este es un comentario personalizado actualizado'
                        }
                    });

                    // log.debug('Edición', 'Comentario editado exitósamente');
                } 
                else if( scriptContext.type === scriptContext.UserEventType.CREATE ) {
                    let newCustomer = scriptContext.newRecord;// Get created customer
                    let name = newCustomer.getText({fieldId: 'altname'});
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
                    log.debug('xmlContent ', xmlContent);
                    let typeModule = "Clientes";
                    let action = "registrar";
                    let data = {
                        "numero_cliente":"",
                        "identificador_externo": newCustomer.getText({fieldId:'entityid'}),
                        "nombre":newCustomer.getText({fieldId:'companyname'}),
                        "rfc":newCustomer.getText({fieldId:'custentity_mx_rfc'}),
                        "calle":"Enrique Aguilar",
                        "no_exterior":"4212",
                        "no_interior":"43",
                        "colonia":"AGUA  REAL",
                        "localidad":"SAN LUIS POTOSI",
                        "referencia":"",
                        "ciudad":"SAN LUIS POTOSI",
                        "estado":"SAN LUIS POTOSI",
                        "codigo_postal":"31135",
                        "pais":"MEXICO",
                        "telefono1":newCustomer.getText({fieldId:'phone'}),
                        "telefono2":newCustomer.getText({fieldId:'altphone'}),
                        "activo":activo,
                        "email":newCustomer.getText({fieldId:'email'}),
                        "saldo":"",
                        "politica_venta_id":""
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
                    log.debug('response', response.body)
                    let xmlFileContent = response.body;
                    let xmlDocument = xml.Parser.fromString({ text: xmlFileContent });
                    let dataJson = xmlDocument.getElementsByTagName({ tagName: 'informacion' });
                    // log.debug('log después de la llamada a crear registro', '');
                    log.debug('response status', dataJson)
                    let realResult = JSON.parse(dataJson[0].textContent);
                    log.debug('realResult', realResult)

                    // Obtiene el ID del registro recién creado
                    // var customerId = scriptContext.newRecord.id;
                    // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                    var otherId = record.submitFields({
                        type: record.Type.CUSTOMER,
                        id: newCustomer.id,
                        values: {
                            'comments': 'Este es un comentario personalizado'
                        }
                    });
                }

            } catch (error) {
                log.debug('After submit function', error);
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
            log.debug('response status login', dataJson)
            let objResult = dataJson[0].textContent;
            log.debug('objResult login', objResult)
            return objResult;

        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
