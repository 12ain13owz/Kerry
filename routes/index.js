const compression = require('compression')
const express = require('express')
const router = express.Router()

const favicon = require('serve-favicon')
const icurl = './public/images/numtrend.ico'

const session = require('express-session')
const filestore = require('session-file-store')(session)
let options = {
  secret: 'Numtrend',
  resave: true,
  saveUninitialized: true
}

const sqlite3 = require('sqlite3').verbose()
const dbname = 'db_numtrend.sqlite'
const xl = require('excel4node')
const opn = require('opn')

const formatDate = (date, separate) => {
  let d = new Date(date),
    year = d.getFullYear(),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate()

  if (month.length < 2) month = '0' + month
  if (day.length < 2) day = '0' + day

  return [year, month, day].join(separate)
}

router.use(compression())
router.use(session(options))
router.use(favicon(icurl))

opn('http://localhost:3000/keydata', {
  app: 'chrome'
})

router.get('/keydata', (req, res, next) => {
  const db = new sqlite3.Database(dbname)

  if (req.query.date == undefined) {
    if (req.session.datenow == undefined) {
      req.session.datenow = formatDate(new Date(), '-')
    }
  } else {
    req.session.datenow = req.query.date
  }

  db.serialize(() => {
    let sql = 'SELECT * FROM nt_customer WHERE date = ?'

    db.all(sql, [req.session.datenow], (err, rows) => {
      if (err) console.log(err)
      let to = 0
      let ems = 0
      let cod = 0

      if (rows.length > 0) {
        to = rows[rows.length - 1].no

        for (let i = 0; i < rows.length; i++) {
          if (rows[i].cod > 0) cod++
          else ems++
        }
      }

      db.close()
      res.render('keydata', result = [{
        datenow: req.session.datenow,
        from: 1,
        to: to,
        ems: ems,
        cod: cod
      }, {
        customers: rows
      }])
    })
  })
})

router.post('/keydata', (req, res, next) => {
  const db = new sqlite3.Database(dbname)
  let sql = 'SELECT MAX(no) AS ncount FROM nt_customer WHERE date = ?'
  let value = []
  let address = req.body.txtAddressAdditional.split(', ')

  req.session.datenow = req.body.txtDate

  db.serialize(() => {
    db.all(sql, [req.body.txtDate], (err, rows) => {
      if (err) console.log(err)
      rows[0].ncount++

      sql = 'INSERT INTO nt_customer (no, date, mobile, name, address, subarea, area, ' +
        'province, postalcode, cod, remark, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      value = [
        Number(rows[0].ncount), req.body.txtDate, req.body.txtMobile, req.body.txtName,
        req.body.txtAddress, address[0], address[1], address[2], address[3],
        req.body.txtCOD, req.body.txtRemark, req.body.txtEmail
      ]

      let stmt = db.prepare(sql)
      stmt.run(value)
      stmt.finalize()

      db.close()
      res.redirect('keydata')
    })
  })
})

router.get('/search', (req, res, next) => {
  const db = new sqlite3.Database(dbname)

  db.serialize(() => {
    let sql = 'SELECT * FROM nt_customer'

    db.all(sql, [], (err, rows) => {
      if (err) console.log(err)
      db.close()
      res.render('search', {
        customers: rows
      })
    })
  })
})

router.get('/editdata', (req, res, next) => {
  const db = new sqlite3.Database(dbname)
  let sql = 'SELECT rowid, * FROM nt_customer WHERE date = ? AND no = ?'

  db.serialize(() => {
    db.all(sql, [req.query.date, Number(req.query.no)], (err, rows) => {
      if (err) console.log(err)

      rows[0].date = formatDate(rows[0].date, '-')
      req.session.sid = rows[0].rowid

      db.close()
      res.render('editdata', {
        customer: rows
      })
    })
  })
})

router.post('/editdata', (req, res, next) => {
  const db = new sqlite3.Database(dbname)
  let sql = 'UPDATE nt_customer SET date = ?, mobile = ?, name = ?, address = ?, subarea = ?, ' +
    'area = ?, province = ?, postalcode = ?, cod = ?, remark = ?, email = ? WHERE rowid = ?'
  let address = req.body.txtAddressAdditional.split(', ')

  req.session.datenow = req.body.txtDate

  db.serialize(() => {
    let stmt = db.prepare(sql)
    let value = [
      req.body.txtDate, req.body.txtMobile, req.body.txtName,
      req.body.txtAddress, address[0], address[1], address[2], address[3], req.body.txtCOD,
      req.body.txtRemark, req.body.txtEmail, req.session.sid
    ]

    stmt.run(value)
    stmt.finalize()
    db.close()
    res.redirect('keydata')
  })
})

router.get('/deletedata', (req, res, next) => {
  const db = new sqlite3.Database(dbname)
  let sql = 'DELETE FROM nt_customer WHERE date = ? AND no = ?'

  req.session.datenow = req.query.date

  db.serialize(() => {
    db.all(sql, [req.query.date, Number(req.query.no)], (err, rows) => {
      if (err) console.log(err)
      db.close()
      res.redirect('keydata')
    })
  })
})

router.post('/export', (req, res, next) => {
  const db = new sqlite3.Database(dbname)
  let sql = 'SELECT * FROM nt_customer WHERE date = ? AND no BETWEEN ? AND ?'
  let url = process.env.userprofile +
    String.fromCharCode(92) + 'Desktop' +
    String.fromCharCode(92) + req.body.date + '.xlsx'

  let wb = new xl.Workbook({
    defaultFont: {
      size: 11,
      name: 'Calibri'
    }
  })

  db.serialize(() => {
    db.all(sql, [req.body.date, Number(req.body.from), Number(req.body.to)], (err, rows) => {
      if (err) console.log(err)

      if (rows.length >= 0) {
        let address = ''
        let cod = ''

        for (let i = 0; i < rows.length; i++) {
          address = rows[i].subarea + ' ' +
            rows[i].area + ' ' +
            rows[i].province

          if (rows[i].cod == 0) {
            cod = ''
          } else {
            cod = rows[i].cod.toString()
          }

          ws.cell(9 + i, 1).string((i + 1).toString())
          ws.cell(9 + i, 2).string(rows[i].name)
          ws.cell(9 + i, 3).string(rows[i].mobile.toString())
          ws.cell(9 + i, 4).string(rows[i].email)
          ws.cell(9 + i, 5).string(rows[i].address)
          ws.cell(9 + i, 6).string(address)
          ws.cell(9 + i, 7).string(rows[i].postalcode.toString())
          ws.cell(9 + i, 8).string(cod)
        }
      }

      wb.write(url, (err, stats) => {
        db.close()

        if (err) {
          console.log(err)
          res.status(400).send({
            msg: 'Error! Excel is Working On'
          })
        } else {
          res.send({
            msg: 'Path: ' + url
          })
        }
      })
    })
  })

  let ws = wb.addWorksheet('Sheet 1')
  ws.cell(2, 1).string('KERRY EXPRESS (ส่งไว ส่งชัวร์ ทั่วไทย)')
  ws.cell(4, 1).string('No')
  ws.cell(4, 2).string('Recipient Name')
  ws.cell(4, 3).string('Mobile No.')
  ws.cell(4, 4).string('Email')
  ws.cell(4, 5).string('Address #1')
  ws.cell(4, 6).string('Address #2')
  ws.cell(4, 7).string('Zip Code')
  ws.cell(4, 8).string('COD Amt (Baht)')

  ws.cell(5, 1).string('1')
  ws.cell(5, 2).string('คุณตัวอย่าง ข้อมูล')
  ws.cell(5, 3).string('0999999999')
  ws.cell(5, 4).string('me@sample.com')
  ws.cell(5, 5).string('999/9 หมู่บ้านพัฒนา')
  ws.cell(5, 6).string('แขวงยานนาวา เขตสาทร กรุงเทพมหานคร')
  ws.cell(5, 7).string('10120')
  ws.cell(5, 8).string('500')

  ws.cell(8, 1).string('No')
  ws.cell(8, 2).string('Recipient Name')
  ws.cell(8, 3).string('Mobile No.')
  ws.cell(8, 4).string('Email')
  ws.cell(8, 5).string('Address #1')
  ws.cell(8, 6).string('Address #2')
  ws.cell(8, 7).string('Zip Code')
  ws.cell(8, 8).string('COD Amt (Baht)')
})

/* Convert Text to Number */
/*
router.get('/number', (req, res, next) => {
    const db = new sqlite3.Database('db_numtrend.sqlite')
    let sql = 'SELECT rowid, date, no FROM nt_customer'

    db.serialize(() => {
        db.all(sql, (err, rows) => {
            let k = rows.length - 1
            
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].date != '2018-05-26' && typeof rows[i].no != 'number') {
                    sql = 'UPDATE nt_customer SET no = ? WHERE date = ? AND no = ?'
                    let stmt = db.prepare(sql)

                    stmt.run([Number(rows[i].no), rows[i].date, rows[i].no])
                    stmt.finalize()
                }
                if (i == k) res.send('ok')
            }
            
            console.log(rows)
            res.send('ok')
        })
    })
})

router.get('/delete', (req, res, next) => {
  const db = new sqlite3.Database('db_numtrendCopy.sqlite')
  let sql = 'DELETE FROM nt_customer'

  db.serialize(() => {
    db.all(sql, (err) => {
      if (err) console.log(err)
      db.close()
      res.send('Delete Success!')
    })
  })
})
*/

router.get('*', (req, res) => {
  res.redirect('/keydata')
})

module.exports = router