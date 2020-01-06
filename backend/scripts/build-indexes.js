ret = db.metadata.createIndex({id: 1}, {unique: true }); checkret('metadata id', ret);
ret = db.metadata.createIndex({productId: 1}); checkret('metadata productId', ret);
ret = db.metadata.createIndex({"related.name": 1}); checkret('metadata related.name', ret);
ret = db.metadata.createIndex({productName: 1}); checkret('metadata authorName', ret);
ret = db.metadata.createIndex({savingTime: -1}); checkret('metadata savingTime', ret);

ret = db.supporters.createIndex({ publicKey: 1 }, { unique: true }); checkret('supporters publicKey:', ret);
ret = db.supporters.createIndex({ creationTime: 1 }); checkret('supporters creationTime:', ret);
ret = db.supporters.createIndex({ lastActivity: 1 }); checkret('supporters lastActivity:', ret);

ret = db.thumbnails.createIndex({ id: 1 }, { unique: true }); checkret('thumbnails id:', ret);

ret = db.htmls.createIndex({savingTime: -1}); checkret('htmls savingTime', ret);
ret = db.htmls.createIndex({metadataId: 1}); checkret('htmls metadataId', ret);
ret = db.htmls.createIndex({ id: 1}, { unique: true}); checkret('htmls id', ret);

function checkret(info, retval) {
    retval.info = info;
    printjson(retval);
};
