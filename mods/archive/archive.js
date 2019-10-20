const saito = require('../../lib/saito/saito.js');
const ModTemplate = require('../../lib/templates/modtemplate');


class Archive extends ModTemplate {

  constructor(app) {

    super(app);
    this.name = "Archive";
    this.events = [];

  ***REMOVED***


  async installModule(app) {

    await super.installModule(app);

/****
let tx = app.wallet.createUnsignedTransaction();
    tx.transaction.msg.module = "Email";
    tx.transaction.msg.title = "This is our title";
    tx.transaction.msg.message = "This is the substance of our email";
    tx = app.wallet.signTransaction(tx);

    let sql = "INSERT INTO txs (sig, publickey, tx, ts, type) VALUES ($sig, $publickey, $tx, $ts, $msgtype)";
console.log("\n\n\n\n\n"+sql);
    let params = {
      $sig		:	tx.transaction.sig ,
      $publickey	:	tx.transaction.to[0].add ,  
      $tx		:	JSON.stringify(tx.transaction) ,
      $ts		:	tx.transaction.ts ,
      $msgtype		:	tx.transaction.msg.module 
***REMOVED***
    await app.storage.executeDatabase(sql, params, "archive");
****/

  ***REMOVED***

  onConfirmation(blk, tx, conf, app) {

    let txmsg = tx.returnMessage();

    //
    // by default we just save everything that is an application
    //
    if (conf == 0) {
      if (tx.transaction.msg.module != "") {
	this.saveTransaction(tx);
  ***REMOVED***
***REMOVED***    
   
  ***REMOVED***




  async handlePeerRequest(app, req, peer, mycallback) {

    if (req.request == null) { return; ***REMOVED***
    if (req.data == null) { return; ***REMOVED***

    //
    // only handle archive request
    //
    if (req.request == "archive") {

      switch(req.data.request) {

        case "delete":
          this.deleteTransaction(req.data.tx, req.data.publickey, req.data.sig);
          break;

        case "save":
          this.saveTransaction(req.data.tx);
          break;

        case "load":

          let type = "";
          let num  = 50;
          if (req.data.num != "")  { num = req.data.num; ***REMOVED***
          if (req.data.type != "") { num = req.data.type; ***REMOVED***
          let txs = await this.loadTransactions(type, num);
          let response = {***REMOVED***;
              response.err = "";
              response.txs = txs;
	  mycallback(response);


        default:
          break;
  ***REMOVED***
***REMOVED***
  ***REMOVED***



  async saveTransaction(tx=null) {

    if (tx == null) { return; ***REMOVED***

console.log("TX IS: " );
console.log(JSON.stringify(tx.transaction));

    //
    // TODO - transactions "TO" multiple ppl this means redundant sigs and txs but with unique publickeys
    //
    let msgtype = "";
    if (tx.transaction.msg.module != "") { msgtype = tx.transaction.msg.module; ***REMOVED***

    let sql = "INSERT INTO txs (sig, publickey, tx, ts, type) VALUES ($sig, $publickey, $tx, $ts, $type)";
    let params = {
      $sig		:	tx.transaction.sig ,
      $publickey	:	tx.transaction.to[0].add ,
      $tx		:	JSON.stringify(tx.transaction) ,
      $ts		:	tx.transaction.ts ,
      $type		:	msgtype
***REMOVED***;
    this.app.storage.executeDatabase(sql, params, "archive");

  ***REMOVED***



  async deleteTransaction(tx=null, authorizing_publickey="", authorizing_sig="") {

    if (tx == null) { return; ***REMOVED***

    //
    // the individual requesting deletion should sign the transaction.sig with their own
    // privatekey. this provides a sanity check on ensuring that the right message is
    // deleted
    //
    if (this.app.crypto.verifyMessage(("delete_"+tx.transaction.sig), authorizing_sig, authorizing_publickey)) {

      let sql = "DELETE FROM txs WHERE publickey = $publickey AND sig = $sig";
      let params = {
        $sig		:	tx.transaction.sig ,
        $publickey	:	authorizing_publickey 
  ***REMOVED***;

      this.app.storage.executeDatabase(sql, params, "archive");
console.log("\n\n\n\SUCCESS DELETING\n\n\n");
console.log(sql + " --- " + JSON.stringify(params));
***REMOVED***
  ***REMOVED***


  async loadTransactions(type, num) {

    let sql = "SELECT * FROM txs";
    let params = {***REMOVED***;

    let rows = await this.app.storage.queryDatabase(sql, params, "archive");

    console.log("\n WE HAVE LOADED THE FOLLOWING ROWS FROM DB FOR RETURN TO CLIENT: " + JSON.stringify(rows));

    let txs = [];
    for (let i = 0; i < rows.length; i++) {
      txs.push(rows[i].tx);
***REMOVED***

console.log("\n\n\nRETURNING: ");
    return txs;

  ***REMOVED***

***REMOVED***


module.exports = Archive;

