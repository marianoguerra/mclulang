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

	;; str

	(type $Str (array (mut i8)))
	(global $TYPE_STR (export "TYPE_STR") i32 (i32.const 3))

	(func $strFromMem
			(export "strFromMem")
			(param $start i32) (param $len i32) (result (ref $Val))

		(struct.new $Val
			(global.get $TYPE_STR)
			(call $rawStrFromMem (local.get $start) (local.get $len))))

	(func $rawStrFromMem
			(export "rawStrFromMem")
			(param $start i32) (param $len i32) (result (ref $Str))

		;; let $i: i32, $end: i32, str: Str
	    (local $i i32)
	    (local $end i32)
		(local $arr_i i32)
		(local $str (ref $Str))

	    ;; $end = $start + $len
	    (local.set $end (i32.add (local.get $start) (local.get $len)))

	    ;; $i = $start
	    (local.set $i (local.get $start))

		;; $str = new Str($len)
		(local.set $str (array.new_default $Str (local.get $len)))

	    ;; while ($i < $end)
	    block $loop_exit
	      loop $loop
	        ;; Break the loop if $i >= $end
	        (i32.ge_s (local.get $i) (local.get $end))
	        br_if $loop_exit

			(array.set $Str
				(local.get $str) (local.get $arr_i) (i32.load8_u (local.get $i)))

	        ;; $i++
	        (local.set $i (i32.add (local.get $i) (i32.const 1)))

			;; $arr_i++
			(local.set $arr_i (i32.add (local.get $arr_i) (i32.const 1)))

	        ;; Continue the loop
	        br $loop
	      end
	    end

		(local.get $str)
	)

	(func $valGetStr
			(export "valGetStr") (param $v (ref $Val)) (result (ref $Str))
		(ref.cast (ref $Str)
			(struct.get $Val $v (local.get $v))))

	(func $strLen (export "strLen") (param $v (ref $Val)) (result i32)
		(array.len
			(call $valGetStr (local.get $v))))

	(func $strGetChar
			(export "strGetChar")
			(param $v (ref $Val)) (param $i i32) (result i32)
		(array.get_u $Str
			(call $valGetStr (local.get $v))
			(local.get $i)))

	(func $strEquals
			(export "strEquals")
			(param $a (ref $Val))
			(param $b (ref $Val))
			(result i32)
		(call $rawStrEquals
			(call $valGetStr (local.get $a))
			(call $valGetStr (local.get $b))))

	(func $rawStrEquals
			(export "rawStrEquals")
			(param $aStr (ref $Str))
			(param $bStr (ref $Str))
			(result i32)

		(local $i i32)
		(local $isEqual i32)
		(local $aLen i32)
		(local $bLen i32)

		(local.set $aLen (array.len (local.get $aStr)))
		(local.set $bLen (array.len (local.get $bStr)))

		(if (result i32) (i32.eq (local.get $aLen) (local.get $bLen))
		(then
		    ;; while ($i < $end)
		    block $loop_exit
		      loop $loop
		        ;; Break the loop if $i >= $aLen
		        (i32.ge_s (local.get $i) (local.get $aLen))
				(local.set $isEqual (i32.const 1))
		        br_if $loop_exit
				(local.set $isEqual (i32.const 0))

				(i32.ne
					(array.get_u $Str (local.get $aStr) (local.get $i))
					(array.get_u $Str (local.get $bStr) (local.get $i)))
				;; if aStr[i] != bStr[i]: break
				(br_if $loop_exit)

		        ;; $i++
		        (local.set $i (i32.add (local.get $i) (i32.const 1)))

		        ;; Continue the loop
		        br $loop
		      end
		    end

			(local.get $isEqual)
		)
		(else
			(i32.const 0)
		))
  )
)
