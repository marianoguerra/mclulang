(module
	(memory (export "mem") 10)

	(type $Val (struct (field $tag i8) (field $v anyref)))

	(func $valGetTag (export "valGetTag") (param $v (ref $Val)) (result i32)
		(struct.get_u $Val $tag (local.get $v)))

	;; nil

	(type $Nil (struct))
	(global $TYPE_NIL (export "TYPE_NIL") i32 (i32.const 0))

	(global $NIL (export "NIL") (ref $Val)
		(struct.new $Val (global.get $TYPE_NIL) (struct.new $Nil)))

	(func $isNil (export "isNil") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_NIL)))

	;; int

	(type $Int (struct (field $val i64)))
	(global $TYPE_INT (export "TYPE_INT") i32 (i32.const 1))

	(func $newInt (export "newInt") (param $i i64) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_INT)
			(struct.new $Int (local.get $i))))

	(func $isInt (export "isInt") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_INT)))

	(func $valGetInt
			(export "valGetInt") (param $v (ref $Val)) (result (ref $Int))
		(struct.get $Val $v (local.get $v))
		(ref.cast (ref $Int)))

	(func $valGetI64
			(export "valGetI64") (param $v (ref $Val)) (result i64)
	    (struct.get $Int $val
			(call $valGetInt (local.get $v))))

	;; float

	(type $Float (struct (field $val f64)))
	(global $TYPE_FLOAT (export "TYPE_FLOAT") i32 (i32.const 2))

	(func $newFloat (export "newFloat") (param $i f64) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_FLOAT)
			(struct.new $Float (local.get $i))))

	(func $isFloat (export "isFloat") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_FLOAT)))

	(func $valGetFloat
			(export "valGetFloat") (param $v (ref $Val)) (result (ref $Float))
		(struct.get $Val $v (local.get $v))
		(ref.cast (ref $Float)))

	(func $valGetF64
			(export "valGetF64") (param $v (ref $Val)) (result f64)
	    (struct.get $Float $val
			(call $valGetFloat (local.get $v))))
)
