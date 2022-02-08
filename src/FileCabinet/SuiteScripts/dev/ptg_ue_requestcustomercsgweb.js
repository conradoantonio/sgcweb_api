/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/file', 'N/http', 'N/search', 'N/xml', 'N/record'],
    /**
 * @param{file} file
 * @param{http} http
 * @param{search} search
 * @param{xml} xml
 */
    (file, http, search, xml, record) => {
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
                    let editCustomer = scriptContext.newRecord;// Get edited customer
                    log.debug('Info', 'Edición de cliente');

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

                    // Búsqueda personalizada para 
                    var customerSearchObj = search.create({
                        type: "customer",
                        filters:
                        [
                           ["internalid","anyof",editCustomer.id],
                           "AND", 
                           ["isdefaultshipping","is","T"]
                        ],
                        columns:
                        [
                           search.createColumn({
                              name: "custrecord_ptg_estado",
                              join: "Address",
                              label: "PTG - ESTADO"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_colonia_ruta",
                              join: "Address",
                              label: "PTG - COLONIA Y RUTA"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_exterior_number",
                              join: "Address",
                              label: "Exterior Number"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_interior_number",
                              join: "Address",
                              label: "Interior Number"
                           }),
                           search.createColumn({
                              name: "isdefaultshipping",
                              join: "Address",
                              label: "Dirección de envío predeterminada"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_address_reference",
                              join: "Address",
                              label: "Address Reference"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_street",
                              join: "Address",
                              label: "Street"
                           }),
                           search.createColumn({
                             name: "custrecord_ptg_codigo_postal",
                             join: "Address",
                             label: "PTG - CODIGO POSTAL"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_town_city",
                              join: "Address",
                              label: "Town/City"
                           }),
                           search.createColumn({name: "country", label: "País"})
                        ]
                    });
                    
                    // let dirPre;
                    let dirDefault = {};
                    var searchResultCount = customerSearchObj.runPaged().count;
                    // log.debug("customerSearchObj result count",searchResultCount);
                    customerSearchObj.run().each(function(result){
                        let resDireccion = result.getAllValues();
                        let isDefault = resDireccion['Address.isdefaultshipping'];

                        if ( isDefault == true ) {
                            dirDefault['no_exterior']   = resDireccion['Address.custrecord_ptg_exterior_number'];
                            dirDefault['no_interior']   = resDireccion['Address.custrecord_ptg_interior_number'];
                            dirDefault['estado']        = resDireccion['Address.custrecord_ptg_estado'];
                            dirDefault['calle']         = resDireccion['Address.custrecord_ptg_street'];
                            dirDefault['colonia']       = resDireccion['Address.custrecord_ptg_colonia_ruta'][0]?.text;
                            dirDefault['localidad']     = resDireccion['Address.custrecord_ptg_town_city'];
                            dirDefault['referencia']    = resDireccion['Address.custrecord_ptg_address_reference'];
                            dirDefault['ciudad']        = resDireccion['Address.custrecord_ptg_town_city'];
                            dirDefault['codigo_postal'] = resDireccion['Address.custrecord_ptg_codigo_postal'];
                            dirDefault['pais']          = resDireccion.country[0].text;
                        }

                        // log.debug('pais', resDireccion.country[0].text)
                        // log.debug('res direccion', resDireccion);
                        // log.debug('Estado', resDireccion['Address.custrecord_ptg_estado']);

                        // dirPre = result.getValue({ name: "internalid", label: "Internal ID" });
                        // log.debug('direccion',result.getValue({ name: "internalid", label: "Internal ID" }));
                        // log.debug('direccion_ptg_estado value', result.getValue({name: "custrecord_ptg_estado", label: "PTG - ESTADO"}));
                        // log.debug('direccion_ptg_estado text', result.getText({name: "custrecord_ptg_estado", label: "PTG - ESTADO"}));
                        // .run().each has a limit of 4,000 results
                        return true;
                    });
                    log.debug('formato de direccion', dirDefault);
                    let xmlContent = file.load({ id: res }).getContents();
                    // log.debug('xmlContent ', xmlContent);
                    // log.debug('ID cliente', scriptContext.newRecord.id);
                    let typeModule = "Clientes";
                    let action = "registrar";
                    let data = {
                        "numero_cliente":"",
                        // "identificador_externo":"",
                        "identificador_externo": editCustomer.id,
                        "nombre":editCustomer.getText({fieldId:'companyname'}),
                        "rfc":editCustomer.getText({fieldId:'custentity_mx_rfc'}),
                        "calle":dirDefault['calle'] ?? "",
                        "no_exterior":dirDefault['no_exterior'] ?? "",
                        "no_interior":dirDefault['no_interior'] ?? "",
                        "colonia":dirDefault['colonia'] ?? "",
                        "localidad":dirDefault['localidad'] ?? "",
                        "referencia":dirDefault['referencia'] ?? "",
                        "ciudad":dirDefault['ciudad'] ?? "",
                        "estado":dirDefault['estado'] ?? "",
                        "codigo_postal":( dirDefault['codigo_postal'] && dirDefault['codigo_postal'] != '' ? dirDefault['codigo_postal'] : "31135" ),
                        // "codigo_postal":dirDefault['codigo_postal'] ?? "",
                        "pais":dirDefault['pais'] ?? "",
                        "telefono1":editCustomer.getText({fieldId:'phone'}),
                        "telefono2":editCustomer.getText({fieldId:'altphone'}),
                        "activo":"1",
                        "email":editCustomer.getText({fieldId:'email'}),
                        "saldo":"",
                        "politica_venta_id":""
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
                        let realResult = JSON.parse(dataJson[0].textContent);
                        log.debug('respuesta sgcweb', realResult);
                        log.debug('numero de cliente de sgcweb', realResult.numero_cliente);

                        // Obtiene el ID del registro recién creado
                        var customerId = scriptContext.newRecord.id;
                        // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                        var otherId = record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: customerId,
                            values: {
                                'custentity_ptg_codigodecliente_': realResult.numero_cliente
                            }
                        });

                        log.debug('Actualización', 'Código de cliente actualizado');
                    } else {
                        log.debug('Ocurrió un error', responseCode[0].textContent);
                    }
                } 
                else if( scriptContext.type === scriptContext.UserEventType.CREATE ) {
                    let newCustomer = scriptContext.newRecord;// Get created customer
                    log.debug('cliente', newCustomer);
                    // let rfcVal = newCustomer.getValue({fieldId: 'custentity_mx_rfc'});
                    let res;
                    log.debug('ID cliente', scriptContext.newRecord.id);

                    // Obtiene un objeto con campos de cabecera
                    let customerInfo = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: newCustomer.id,
                        columns: ['companyname']
                    });

                    log.debug('Customer info', customerInfo);

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

                    // Búsqueda personalizada para la dirección del cliente
                    var customerSearchObj = search.create({
                        type: "customer",
                        filters:
                        [
                           ["internalid","anyof",newCustomer.id],
                           "AND", 
                           ["isdefaultshipping","is","T"]
                        ],
                        columns:
                        [
                           search.createColumn({
                              name: "custrecord_ptg_estado",
                              join: "Address",
                              label: "PTG - ESTADO"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_colonia_ruta",
                              join: "Address",
                              label: "PTG - COLONIA Y RUTA"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_exterior_number",
                              join: "Address",
                              label: "Exterior Number"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_interior_number",
                              join: "Address",
                              label: "Interior Number"
                           }),
                           search.createColumn({
                              name: "isdefaultshipping",
                              join: "Address",
                              label: "Dirección de envío predeterminada"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_address_reference",
                              join: "Address",
                              label: "Address Reference"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_street",
                              join: "Address",
                              label: "Street"
                           }),
                           search.createColumn({
                              name: "custrecord_ptg_codigo_postal",
                              join: "Address",
                              label: "PTG - CODIGO POSTAL"
                            }),
                           search.createColumn({
                              name: "custrecord_ptg_town_city",
                              join: "Address",
                              label: "Town/City"
                           }),
                           search.createColumn({name: "country", label: "País"})
                        ]
                    });
                    
                    // let dirPre;
                    let dirDefault = {};
                    var searchResultCount = customerSearchObj.runPaged().count;
                    // log.debug("customerSearchObj result count",searchResultCount);
                    customerSearchObj.run().each(function(result){
                        let resDireccion = result.getAllValues();
                        let isDefault = resDireccion['Address.isdefaultshipping'];

                        if ( isDefault == true ) {
                            dirDefault['no_exterior']   = resDireccion['Address.custrecord_ptg_exterior_number'];
                            dirDefault['no_interior']   = resDireccion['Address.custrecord_ptg_interior_number'];
                            dirDefault['estado']        = resDireccion['Address.custrecord_ptg_estado'];
                            dirDefault['calle']         = resDireccion['Address.custrecord_ptg_street'];
                            dirDefault['colonia']       = resDireccion['Address.custrecord_ptg_colonia_ruta'][0]?.text;
                            dirDefault['localidad']     = resDireccion['Address.custrecord_ptg_town_city'];
                            dirDefault['referencia']    = resDireccion['Address.custrecord_ptg_address_reference'];
                            dirDefault['ciudad']        = resDireccion['Address.custrecord_ptg_town_city'];
                            dirDefault['codigo_postal'] = resDireccion['Address.custrecord_ptg_codigo_postal'];
                            dirDefault['pais']          = resDireccion.country[0].text;
                        }

                        // log.debug('pais', resDireccion.country[0].text)
                        // log.debug('res direccion', resDireccion);
                        // log.debug('Estado', resDireccion['Address.custrecord_ptg_estado']);

                        // dirPre = result.getValue({ name: "internalid", label: "Internal ID" });
                        // log.debug('direccion',result.getValue({ name: "internalid", label: "Internal ID" }));
                        // log.debug('direccion_ptg_estado value', result.getValue({name: "custrecord_ptg_estado", label: "PTG - ESTADO"}));
                        // log.debug('direccion_ptg_estado text', result.getText({name: "custrecord_ptg_estado", label: "PTG - ESTADO"}));
                        // .run().each has a limit of 4,000 results
                        return true;
                    });
                    log.debug('formato de direccion', dirDefault);

                    let xmlContent = file.load({ id: res }).getContents();
                    log.debug('xmlContent ', xmlContent);
                    let typeModule = "Clientes";
                    let action = "registrar";
                    let data = {
                        "numero_cliente":"",
                        "identificador_externo":newCustomer.id,
                        "nombre":customerInfo.companyname,
                        "rfc":newCustomer.getValue({fieldId:'custentity_mx_rfc'}),
                        "calle":dirDefault['calle'] ?? "",
                        "no_exterior":dirDefault['no_exterior'] ?? "",
                        "no_interior":dirDefault['no_interior'] ?? "",
                        "colonia":dirDefault['colonia'] ?? "",
                        "localidad":dirDefault['localidad'] ?? "",
                        "referencia":dirDefault['referencia'] ?? "",
                        "ciudad":dirDefault['ciudad'] ?? "",
                        "estado":dirDefault['estado'] ?? "",
                        "codigo_postal":( dirDefault['codigo_postal'] && dirDefault['codigo_postal'] != '' ? dirDefault['codigo_postal'] : "31135" ),
                        // "codigo_postal":dirDefault['codigo_postal'] ?? "",
                        "pais":dirDefault['pais'] ?? "",
                        "telefono1":newCustomer.getValue({fieldId:'phone'}),
                        "telefono2":newCustomer.getValue({fieldId:'altphone'}),
                        "activo":"1",
                        "email":newCustomer.getValue({fieldId:'email'}),
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
                    log.debug('response', response.body);
                    let xmlFileContent = response.body;
                    let xmlDocument = xml.Parser.fromString({ text: xmlFileContent });
                    let dataJson = xmlDocument.getElementsByTagName({ tagName: 'informacion' });
                    let responseCode = xmlDocument.getElementsByTagName({ tagName: 'codigo' });
                    // log.debug('log después de la llamada a crear registro', '');
                    log.debug('response status', dataJson);
                    let realResult = JSON.parse(dataJson[0].textContent);
                    log.debug('realResult', realResult);

                    // Se validará que haya salido bien el response
                    if (["1111", "0000"].includes(responseCode[0].textContent) ) {
                        log.debug('Response code info', 'Todo salió bien');
                        let realResult = JSON.parse(dataJson[0].textContent);
                        log.debug('respuesta sgcweb', realResult);
                        log.debug('numero de cliente de sgcweb', realResult.numero_cliente);

                        // Obtiene el ID del registro recién creado
                        var customerId = scriptContext.newRecord.id;
                        // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                        var otherId = record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: customerId,
                            values: {
                                'custentity_ptg_codigodecliente_': realResult.numero_cliente
                            }
                        });

                        log.debug('Actualización', 'Código de cliente actualizado');
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
