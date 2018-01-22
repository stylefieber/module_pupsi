module.exports = function(paramConfig) {
    
    var Treeize = require('treeize')
    var _ = require('lodash')

    var module = {}

    var db = paramConfig.db
    var models = paramConfig.models

    var config = {
        db: db,
        jsonSqlOptions: {
            dialect: paramConfig.dialect,
            separatedValues: true,
            wrappedIdentifiers: false,
            namedValues: false,
            indexedValues: false,
            valuesPrefix: '?'
        }
    }

    var jsonSql = require('json-sql')(config.jsonSqlOptions)

    module.getDataRaw = async function(data) {
        var result = {}

        var level
        var uid

        for (item in data) {
            try {
                var as = item
                if (data[item].as) as = data[item].as
                result[as] = await getTableData(item, data[item], level, uid)
            } catch(err) {
                throw err
            }
        }
        return result
    }

    module.getData = async function(req, res) {
        var data = req.body

        var result = {};

        var level
        var uid
        if (req.level) level = req.level
        if (req.uid) uid = req.uid

        for (item in data) {
            try {
                var as = item
                if (data[item].as) as = data[item].as
                result[as] = await getTableData(item, data[item], level, uid)
            } catch(err) {
                res.send(err)
                throw err
            }
        }
        res.json(result)
        return
    }

    async function getTableData(modelName, queryObject, level, uid) {
        if (!models[modelName]) throw("model " + modelName + " does not exist")

        //get model properties and clone it
        var model = _.cloneDeep(models[modelName])
        var queryBrain = {
            tableCount: 1
        }
        var as = 't' + queryBrain.tableCount
        var table = model.tableName
        if (!queryObject.as) queryObject.as = ''
        var allowedFields = _.clone(model.read.all)
        var condition = {}
        if (queryObject.condition) condition = _.clone(queryObject.condition)

        console.dir(model.auth(uid, condition));

        var fields;
        if (queryObject.fields) {
            fields = _.intersection(allowedFields, queryObject.fields)
        }
        else if (queryObject.excludeFields) {
            fields = _.difference(allowedFields, queryObject.excludeFields)
        }
        else {
            fields = allowedFields
        }

        fieldNameManipulator(fields, as)
        condition = conditionNameManipulator(condition, as)
        console.dir(condition);
        addRowIdentifier(fields, as, model.primaryKey, '')

        var joins = [];
        if (queryObject.join) {
            var i = 0;
            for (item in queryObject.join) {
                i++;
                //console.dir(i)
                addJoin(item, queryObject.join[item], queryObject, model, null, queryBrain, fields, joins, level, uid);
            }
        }

        var query = {
            type: 'select',
            table: table,
            alias: as,
            fields: fields,
            condition: condition
        };

        query.join = joins
        
        var sql = jsonSql.build(query)

        try {
            var result = await db.query(sql.query, sql.values)
            result = result[0]
        } catch(err) {
            return err;
            console.dir(err)
        }
        //return result;
        var nestIt = new Treeize();
        nestIt.grow(result, {input: { detectCollections: true}});
        var returnObj = nestIt.getData();
        return(returnObj);
    }

    function addJoin(modelName, queryObject, parentQueryObject, parentModel, parentAs, queryBrain, paramFields, joins, level) {
        if (!models[modelName]) throw("model " + modelName + " does not exist")
        var model = _.cloneDeep(models[modelName])
        queryBrain.tableCount++;
        var as = 't' + queryBrain.tableCount
        var table = model.tableName
        var allowedFields = _.clone(model.read.all)
        if (!_.has(parentModel, 'relations.'+modelName)) throw("no proper relation defined for joining model " + modelName)
        var relation = parentModel.relations[modelName]

        if (!queryObject.as) {
            queryObject.as = relation.as
        }
        if (parentAs) {
            queryObject.as = parentAs + ":" + queryObject.as
        }

        var fields
        if (queryObject.fields) {
            fields = _.intersection(allowedFields, queryObject.fields)
        }
        else if (queryObject.excludeFields) {
            fields = _.difference(allowedFields, queryObject.excludeFields)
        }
        else {
            fields = allowedFields
        }
        joinFieldNameManipulator(fields, paramFields, as, queryObject.as)
        addRowIdentifier(paramFields, as, model.primaryKey, queryObject.as + ":")

        var condition = {}
        condition["t"+queryBrain.tableCount + "." + relation.fKey] = "t"+(queryBrain.tableCount-1) + "." + relation.key
        var join = {}
        join.type = "left"
        join.table = model.tableName
        join.alias = as;
        join.on = condition
        joins.push(join);

        if (queryObject.join) {
            for (item in queryObject.join) {
                addJoin(item, queryObject.join[item], queryObject, model, queryObject.as, queryBrain, paramFields, joins, level);
            }
        }
        
    }

    function fieldNameManipulator(fields, tableAlias) {
        for (var x = 0; x < fields.length; x++) {
            var field = fields[x];
            fields[x] = tableAlias + "." + fields[x]
        }
    }
    function conditionNameManipulator(condition, tableAlias) {
        for (item in condition) {
            condition[tableAlias + "." + item] = condition[item]
            delete condition[item]
        }
        return condition
    }

    function joinFieldNameManipulator(fields, paramFields, tableAlias, objectName) {
        for (var x = 0; x < fields.length; x++) {
            var field = fields[x]
            fields[x] = tableAlias + "." + fields[x] + " AS '" + objectName + ":" + fields[x] +"'"
            paramFields.push(fields[x])
        }
    }

    function addRowIdentifier(paramFields, tableAlias, field, prefix, parentObjectName) {
        paramFields.push(tableAlias + '.' + field + " AS '" + prefix + field + "*'")
    }

    module.setData = async function() {

    }

    module.createData = async function(req, res) {
        var data = req.body
        var result = {};

        var level
        var uid
        if (req.level) level = req.level
        if (req.uid) uid = req.uid

        if (!models[modelName]) throw("model " + modelName + " does not exist")
    }

    return module;

}
    
        