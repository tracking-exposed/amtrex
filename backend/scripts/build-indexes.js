ret = db.metadata.createIndex({id: 1}, {unique: true }); checkret('metadata id', ret);
ret = db.metadata.createIndex({productId: 1}); checkret('metadata videoId', ret);
ret = db.metadata.createIndex({"related.videoId": 1}); checkret('metadata related.videoId', ret);
ret = db.metadata.createIndex({authorName: 1}); checkret('metadata authorName', ret);
ret = db.metadata.createIndex({savingTime: -1}); checkret('metadata savingTime', ret);

ret = db.supporters.createIndex({ publicKey: 1 }, { unique: true }); checkret('supporters publicKey:', ret);

ret = db.thumbnails.createIndex({ id: 1 }, { unique: true }); checkret('thumbnails id:', ret);

ret = db.htmls.createIndex({ savingTime: -1 }); checkret('htmls savingTime', ret);
ret = db.htmls.createIndex({metadataId: 1}); checkret('htmls metadataId', ret);

function checkret(info, retval) {
    retval.info = info;
    printjson(retval);
};
