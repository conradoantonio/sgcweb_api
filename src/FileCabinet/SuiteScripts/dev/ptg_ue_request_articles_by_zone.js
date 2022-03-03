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
                let rowItem = scriptContext.newRecord;

                if( scriptContext.type === scriptContext.UserEventType.CREATE ) {
                    log.debug('Info', 'Creación de articulo');
                    // Obtiene un objeto con campos de cabecera
                    let aditionalInfo = search.lookupFields({
                        type: 'customrecord_ptg_articulos_por_zona_',
                        id: rowItem.id,
                        columns: ['name']
                    });
                    let internalFileId = searchXmlFile(search);
                    let xmlContent = file.load({ id: internalFileId }).getContents();
                    let dataToSend = setDataArticle(rowItem, aditionalInfo, 'create', search);
                    let typeModule = "Productos";
                    let action = "registrar";
                    let responseInfo = registerArticle(xmlContent, idToken, typeModule, action, dataToSend);
                    
                    log.debug('Response info', responseInfo);

                    // Se validará que haya salido bien el response
                    if (["1111", "0000"].includes(responseInfo.code[0].textContent) ) {
                        log.debug('Response code info', responseInfo.code[0]);
                        log.debug('Respuesta oficial sgcweb', responseInfo.info[0]);
                    } else {
                        log.debug('Ocurrió un error', responseInfo.code[0].textContent);
                    }
                }
                else if ( scriptContext.type === scriptContext.UserEventType.EDIT ) {
                    log.debug('Info', 'Edición de articulo');

                    let internalFileId = searchXmlFile(search);
                    let xmlContent = file.load({ id: internalFileId }).getContents();
                    let dataToSend = setDataArticle(rowItem, null, 'edit', search);
                    let typeModule = "Productos";
                    let action = "registrar";
                    let responseInfo = registerArticle(xmlContent, idToken, typeModule, action, dataToSend);

                    log.debug('Response info', responseInfo);

                    // Se validará que haya salido bien el response
                    if (["1111", "0000"].includes(responseInfo.code[0].textContent) ) {
                        log.debug('Response code info', responseInfo.code[0]);
                        log.debug('Respuesta oficial sgcweb', responseInfo.info[0]);
                    } else {
                        log.debug('Ocurrió un error', responseInfo.code[0].textContent);
                    }
                }

            } catch (error) {
                log.debug('Algo salió mal', error);
            }
        }

        // Login
        const login = () => {
            let resFileId;
            
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
                resFileId = result.getValue({ name: "internalid", label: "Internal ID" });
                return true;
            });

            let xmlContent = file.load({ id: resFileId }).getContents();
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

        // Configura los datos a enviar del producto a SGC web
        const setDataArticle = (rowItem, aditionalCustomerInfo = false, type, search) => {
            // log.debug('info', 'entró a la función de configurar la información del producto');

            let visibleEn       = "";
            let nombre          = ( type == 'edit' ? rowItem.getText({fieldId:'name'}) : aditionalCustomerInfo?.name );
            let costoUnitario   = ( type == 'edit' ? rowItem.getValue({fieldId:'custrecord_ptg_monto_costo_unitario_'}) : rowItem.getValue({fieldId:'custrecord_ptg_monto_costo_unitario_'}) );
            let precioSinImp    = ( type == 'edit' ? rowItem.getValue({fieldId:'custrecord_ptg_precio_sin_impuesto_'}) : rowItem.getValue({fieldId:'custrecord_ptg_precio_sin_impuesto_'}) );
            let precioVenta     = ( type == 'edit' ? rowItem.getValue({fieldId:'custrecordptg_precio_venta_'}) : rowItem.getValue({fieldId:'custrecordptg_precio_venta_'}) );
            let tasaImpuesto    = ( type == 'edit' ? rowItem.getValue({fieldId:'custrecord_ptg_tasa_impuesto_'}) : rowItem.getValue({fieldId:'custrecord_ptg_tasa_impuesto_'}) );
            let visibleEnVal    = ( type == 'edit' ? rowItem.getValue({fieldId:'custrecord_ptg_visible_en_'}) : rowItem.getValue({fieldId:'custrecord_ptg_visible_en_'}) );
            let activo          = rowItem.getValue({fieldId:'custrecord_ptg_activo_'}) == true ? 1 : 0;
            let listaDescuentos = getDiscountsArticle(rowItem, search);

            if ( visibleEnVal == 1 ) { visibleEn = "portatil"; }
            else if ( visibleEnVal == 2 ) { visibleEn = "consumidor"; }
            else if ( visibleEnVal == 3 ) { visibleEn = "hikashop"; }

            let data = {
    			"nombre":nombre,
                "identificador_externo":rowItem.id,
                "monto_costo_unitario":costoUnitario,
                "precio_sin_impuesto":precioSinImp,
                "precio_venta":precioVenta,
                "tasa_impuesto":tasaImpuesto,
                "unidad_medida":"Litro",
                "activo":activo,
                "visible_en":[visibleEn],
                "lista_descuentos":listaDescuentos.length ? listaDescuentos : ""
            };

            return data;
        }

        // Obtiene mediante búsqueda guardada los descuentos de un artículo
        const getDiscountsArticle = (rowItem, search) => {
            let articuloDescuentos = [];
            var customrecord_ptg_articulos_por_zona_SearchObj = search.create({
                type: "customrecord_ptg_articulos_por_zona_",
                filters:
                [
                    ["internalid","anyof",rowItem.id], 
                    "AND", 
                    ["custrecord_ptg_art_desc_.internalid","noneof","@NONE@"]
                ],
                columns:
                [
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_PTG_ART_DESC_",
                        label: "ID interno"
                    }),
                    search.createColumn({
                        name: "name",
                        join: "CUSTRECORD_PTG_ART_DESC_",
                        label: "Nombre"
                    }),
                    search.createColumn({
                        name: "custrecordptg_precio_descuento",
                        join: "CUSTRECORD_PTG_ART_DESC_",
                        label: "PTG - Precio Descuento"
                    }),
                    search.createColumn({
                        name: "custrecord_ptg_cantidad_descuento_",
                        join: "CUSTRECORD_PTG_ART_DESC_",
                        sort: search.Sort.ASC,
                        label: "PTG - Cantidad descuento"
                    }),
                    search.createColumn({
                        name: "custrecord_ptg_descuento_activo_",
                        join: "CUSTRECORD_PTG_ART_DESC_",
                        label: "PTG - Activo"
                    })
                ]
            });

            customrecord_ptg_articulos_por_zona_SearchObj.run().each(function(result){
                let resDiscount = result.getAllValues();
                let discount = {};

                discount['identificador_externo_d'] = resDiscount['CUSTRECORD_PTG_ART_DESC_.internalid'][0].value;
                discount['precio']                  = resDiscount['CUSTRECORD_PTG_ART_DESC_.custrecordptg_precio_descuento'];
                discount['activo']                  = resDiscount['CUSTRECORD_PTG_ART_DESC_.custrecord_ptg_descuento_activo_'] ? 1 : 0;

                articuloDescuentos.push(discount);
                return true;
             });

             return articuloDescuentos;
        }

        // Guarda / actualiza un producto en SGC web
        const registerArticle = (xmlContent, idToken, typeModule, action, data) => {
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
