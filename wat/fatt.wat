(module
	(memory (export "mem") 10)

	(type $Val (struct (field $tag i8) (field $v eqref)))

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

	(global $TRUE (export "TRUE") (ref $Val)
		(struct.new $Val (global.get $TYPE_INT) (struct.new $Int (i64.const 1))))

	(func $newInt (export "newInt") (param $i i64) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_INT)
			(struct.new $Int (local.get $i))))

	(func $isInt (export "isInt") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_INT)))

	(func $valGetInt (export "valGetInt") (param $v (ref $Val)) (result (ref $Int))
		(ref.cast (ref $Int) (struct.get $Val $v (local.get $v))))

	(func $valGetI64 (export "valGetI64") (param $v (ref $Val)) (result i64)
	    (struct.get $Int $val
			(call $valGetInt (local.get $v))))

	(func $valGetI32 (export "valGetI32") (param $v (ref $Val)) (result i32)
		(i32.wrap_i64 (struct.get $Int $val (call $valGetInt (local.get $v)))))

	;; float

	(type $Float (struct (field $val f64)))
	(global $TYPE_FLOAT (export "TYPE_FLOAT") i32 (i32.const 2))

	(func $newFloat (export "newFloat") (param $i f64) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_FLOAT)
			(struct.new $Float (local.get $i))))

	(func $isFloat (export "isFloat") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_FLOAT)))

	(func $valGetFloat (export "valGetFloat")
			(param $v (ref $Val)) (result (ref $Float))
		(ref.cast (ref $Float) (struct.get $Val $v (local.get $v))))

	(func $valGetF64 (export "valGetF64") (param $v (ref $Val)) (result f64)
	    (struct.get $Float $val (call $valGetFloat (local.get $v))))

	;; str

	(type $Str (array (mut i8)))
	(global $TYPE_STR (export "TYPE_STR") i32 (i32.const 3))

	(func $isStr (export "isStr") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_STR)))

	(func $strFromRawStr (param $rs (ref $Str)) (result (ref $Val))
		(struct.new $Val (global.get $TYPE_STR) (local.get $rs)))

	(func $strFromMem (export "strFromMem")
			(param $start i32) (param $len i32) (result (ref $Val))
		(call $strFromRawStr
			(call $rawStrFromMem (local.get $start) (local.get $len))))

	(func $rawStrFromMem (export "rawStrFromMem")
			(param $start i32) (param $len i32) (result (ref $Str))

	    (local $i i32)
	    (local $end i32)
		(local $arr_i i32)
		(local $str (ref $Str))

	    (local.set $end (i32.add (local.get $start) (local.get $len)))
	    (local.set $i (local.get $start))
		(local.set $str (array.new_default $Str (local.get $len)))

	    ;; while ($i < $end)
	    block $loop_exit
	      loop $loop
	        ;; Break the loop if $i >= $end
	        (i32.ge_s (local.get $i) (local.get $end))
	        br_if $loop_exit

			(array.set $Str
				(local.get $str) (local.get $arr_i) (i32.load8_u (local.get $i)))

	        (local.set $i (i32.add (local.get $i) (i32.const 1)))
			(local.set $arr_i (i32.add (local.get $arr_i) (i32.const 1)))

	        br $loop
	      end
	    end

		(local.get $str))

	(func $valGetStr (export "valGetStr") (param $v (ref $Val)) (result (ref $Str))
		(ref.cast (ref $Str) (struct.get $Val $v (local.get $v))))

	(func $strLen (export "strLen") (param $v (ref $Val)) (result i32)
		(array.len (call $valGetStr (local.get $v))))

	(func $strGetChar (export "strGetChar")
			(param $v (ref $Val)) (param $i i32) (result i32)
		(array.get_u $Str (call $valGetStr (local.get $v)) (local.get $i)))

	(func $strEquals (export "strEquals")
			(param $a (ref $Val)) (param $b (ref $Val)) (result i32)
		(call $rawStrEquals
			(call $valGetStr (local.get $a))
			(call $valGetStr (local.get $b))))

	(func $rawStrEquals (export "rawStrEquals")
			(param $aStr (ref $Str)) (param $bStr (ref $Str)) (result i32)
		(local $i i32)
		(local $isEqual i32)
		(local $aLen i32)
		(local $bLen i32)

		(local.set $aLen (array.len (local.get $aStr)))
		(local.set $bLen (array.len (local.get $bStr)))

		(i32.eq (local.get $aLen) (local.get $bLen))
		if (result i32)
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

		        (local.set $i (i32.add (local.get $i) (i32.const 1)))

		        br $loop
		      end
		    end

			(local.get $isEqual)
		else
			(i32.const 0)
		end)

	(func $rawStrLt (export "rawStrLt")
			(param $aStr (ref $Str)) (param $bStr (ref $Str)) (result i32)
		(local $i i32)
		(local $r i32)
		(local $aLen i32)
		(local $bLen i32)

		(local.set $aLen (array.len (local.get $aStr)))
		(local.set $bLen (array.len (local.get $bStr)))

		(i32.eq (local.get $aLen) (local.get $bLen))
		if (result i32)
		    ;; while ($i < $end)
		    block $loop_exit
		      loop $loop
		        ;; Break the loop if $i >= $aLen
		        (i32.ge_s (local.get $i) (local.get $aLen))
				(local.set $r (i32.const 1))
		        br_if $loop_exit
				(local.set $r (i32.const 0))

				(i32.ge_u
					(array.get_u $Str (local.get $aStr) (local.get $i))
					(array.get_u $Str (local.get $bStr) (local.get $i)))
				;; if aStr[i] >= bStr[i]: break
				(br_if $loop_exit)

		        (local.set $i (i32.add (local.get $i) (i32.const 1)))

		        br $loop
		      end
		    end

			(local.get $r)
		else
			(i32.const 0)
		end)

	;; pair

	(type $Pair (struct (field $a (ref $Val)) (field $b (ref $Val))))
	(global $TYPE_PAIR (export "TYPE_PAIR") i32 (i32.const 4))
	
	(func $isPair (export "isPair") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_PAIR)))

	(func $newPairFromRaw
			(param $p (ref $Pair)) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_PAIR)
			(local.get $p)))

	(func $newPair (export "newPair")
			(param $a (ref $Val)) (param $b (ref $Val)) (result (ref $Val))
		(call $newPairFromRaw
			(struct.new $Pair (local.get $a) (local.get $b))))

	(func $valGetPair (export "valGetPair")
			(param $v (ref $Val)) (result (ref $Pair))
		(ref.cast (ref $Pair) (struct.get $Val $v (local.get $v))))

	(func $pairGetA (export "pairGetA") (param $v (ref $Val)) (result (ref $Val))
		(struct.get $Pair $a (call $valGetPair (local.get $v))))

	(func $pairGetB (export "pairGetB") (param $v (ref $Val)) (result (ref $Val))
		(struct.get $Pair $b (call $valGetPair (local.get $v))))

	;; name

	(type $Name (struct (field $name (ref $Str))))
	(global $TYPE_NAME (export "TYPE_NAME") i32 (i32.const 5))

	(func $isName (export "isName") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_NAME)))

	(func $valGetNameRawStr (export "valGetNameRawStr")
			(param $v (ref $Val)) (result (ref $Str))
		(struct.get $Name $name
			(ref.cast (ref $Name) (struct.get $Val $v (local.get $v)))))

	(func $valGetNameStr (export "valGetNameStr")
			(param $v (ref $Val)) (result (ref $Val))
		(call $strFromRawStr (call $valGetNameRawStr (local.get $v))))

	(func $newName (export "newName") (param $s (ref $Str)) (result (ref $Val))
		(struct.new $Val (global.get $TYPE_NAME) (struct.new $Name (local.get $s))))

	;; later

	(type $Later (struct (field $val (ref $Val))))
	(global $TYPE_LATER (export "TYPE_LATER") i32 (i32.const 6))

	(func $isLater (export "isLater") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_LATER)))

	(func $newLater (export "newLater") (param $v (ref $Val)) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_LATER)
			(struct.new $Later (local.get $v))))

	(func $laterUnwrap (export "laterUnwrap")
			(param $v (ref $Val)) (result (ref $Val))
		(struct.get $Later $val
			(ref.cast (ref $Later) (struct.get $Val $v (local.get $v)))))

	;; msg

	(type $Msg (struct (field $verb (ref $Str)) (field $obj (ref $Val))))
	(global $TYPE_MSG (export "TYPE_MSG") i32 (i32.const 7))

	(func $isMsg (export "isMsg") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_MSG)))

	(func $newRawMsg (export "newRawMsg")
			(param $verb (ref $Str)) (param $obj (ref $Val)) (result (ref $Msg))
		(struct.new $Msg (local.get $verb) (local.get $obj)))

	(func $newMsg (export "newMsg")
			(param $verb (ref $Str)) (param $obj (ref $Val)) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_MSG)
			(struct.new $Msg (local.get $verb) (local.get $obj))))

	(func $valGetMsgRaw (export "valGetMsgRaw")
			(param $v (ref $Val)) (result (ref $Msg))
		(ref.cast (ref $Msg) (struct.get $Val $v (local.get $v))))

	(func $valGetMsgVerbRawStr (param $v (ref $Val)) (result (ref $Str))
		(struct.get $Msg $verb (call $valGetMsgRaw (local.get $v))))

	(func $valGetMsgVerb (export "valGetMsgVerb")
			(param $v (ref $Val)) (result (ref $Val))
		(call $strFromRawStr (call $valGetMsgVerbRawStr (local.get $v))))

	(func $valGetMsgObj (export "valGetMsgObj")
			(param $v (ref $Val)) (result (ref $Val))
		(struct.get $Msg $obj (call $valGetMsgRaw (local.get $v))))

	;; send

	(type $Send (struct (field $subj (ref $Val)) (field $msg (ref $Msg))))
	(global $TYPE_SEND (export "TYPE_SEND") i32 (i32.const 8))

	(func $isSend (export "isSend") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_SEND)))

	(func $newSend (export "newSend")
			(param $subj (ref $Val)) (param $msg (ref $Msg))
			(result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_SEND)
			(struct.new $Send (local.get $subj) (local.get $msg))))

	(func $valGetSendSubj (export "valGetSendSubj")
			(param $v (ref $Val)) (result (ref $Val))
		(struct.get $Send $subj
			(ref.cast (ref $Send) (struct.get $Val $v (local.get $v)))))

	(func $valGetSendMsg (export "valGetSendMsg")
			(param $v (ref $Val)) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_MSG)
			(struct.get $Send $msg
				(ref.cast (ref $Send) (struct.get $Val $v (local.get $v))))))

	;; block

	(type $Block (array (mut (ref $Val))))
	(global $TYPE_BLOCK (export "TYPE_BLOCK") i32 (i32.const 9))

	(func $isBlock (export "isBlock") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_BLOCK)))

	(func $newBlock (export "newBlock") (param $size i32) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_BLOCK)
			(array.new $Block (global.get $NIL) (local.get $size))))

	(func $valGetBlockRaw (param $v (ref $Val)) (result (ref $Block))
		(ref.cast (ref $Block) (struct.get $Val $v (local.get $v))))

	(func $blockLen (export "blockLen") (param $v (ref $Val)) (result i32)
		(array.len (call $valGetBlockRaw (local.get $v))))
	
	(func $blockGetItem (export "blockGetItem")
			(param $v (ref $Val)) (param $i i32) (result (ref $Val))
		(array.get $Block (call $valGetBlockRaw (local.get $v)) (local.get $i)))

	(func $blockSetItem (export "blockSetItem")
			(param $v (ref $Val)) (param $i i32) (param $item (ref $Val))
		(array.set $Block
			(call $valGetBlockRaw (local.get $v))
			(local.get $i)
			(local.get $item)))

	;; array

	(type $Array (array (mut (ref $Val))))
	(global $TYPE_ARRAY (export "TYPE_ARRAY") i32 (i32.const 10))

	(func $isArray (export "isArray") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_ARRAY)))

	(func $newArray (export "newArray") (param $size i32) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_ARRAY)
			(array.new $Array (global.get $NIL) (local.get $size))))

	(func $valGetArrayRaw (param $v (ref $Val)) (result (ref $Array))
		(ref.cast (ref $Array) (struct.get $Val $v (local.get $v))))

	(func $arrayLen (export "arrayLen") (param $v (ref $Val)) (result i32)
		(array.len (call $valGetArrayRaw (local.get $v))))
	
	(func $arrayGetItem (export "arrayGetItem")
			(param $v (ref $Val)) (param $i i32) (result (ref $Val))
		(array.get $Array (call $valGetArrayRaw (local.get $v)) (local.get $i)))

	(func $arraySetItem (export "arraySetItem")
			(param $v (ref $Val)) (param $i i32) (param $item (ref $Val))
		(array.set $Array
			(call $valGetArrayRaw (local.get $v))
			(local.get $i)
			(local.get $item)))

	;; bind entry

	(type $BindEntry
		(struct
			(field $key (ref $Str))
			(field $val (ref $Val))
			(field $up (ref null $BindEntry))))

	(func $newBindNull (export "newBindNull") (result (ref null $BindEntry))
		(ref.null $BindEntry))

	(func $newBindEntry (export "newBindEntry")
			(param $k (ref $Str))
			(param $v (ref $Val))
			(param $up (ref null $BindEntry))
			(result (ref $BindEntry))
		(struct.new $BindEntry (local.get $k) (local.get $v) (local.get $up)))

	(func $bindFind (export "bindFind")
			(param $be (ref null $BindEntry)) (param $key (ref $Str))
			(result (ref null $Val))

		(ref.is_null (local.get $be))
		if (result (ref null $Val))
			(ref.null $Val)
		else
			(call $rawStrEquals
				(local.get $key)
				(struct.get $BindEntry $key (local.get $be)))
			if (result (ref null $Val))
				(struct.get $BindEntry $val (local.get $be))
			else
				(call $bindFind
					(struct.get $BindEntry $up (local.get $be))
					(local.get $key))
			end
		end)

	;; handler

	(type $HandlerFn
		(func
			(param $subj eqref)
			(param $verb eqref)
			(param $obj eqref)
			(param $e eqref)
			(result eqref)))

	(type $Handler
		(struct (field $fn (ref null $HandlerFn)) (field $val (ref null $Val))))

	(func $newFnHandler (param $fn (ref $HandlerFn)) (result (ref $Handler))
		(struct.new $Handler (local.get $fn) (ref.null $Val)))

	(func $newValHandler (param $val (ref $Val)) (result (ref $Handler))
		(struct.new $Handler (ref.null $HandlerFn) (local.get $val)))

	(func $handlerGetFn (export "handlerGetFn")
			(param $self (ref $Handler)) (result (ref $HandlerFn))
		(ref.as_non_null (struct.get $Handler $fn (local.get $self))))

	(func $handlerGetVal (export "handlerGetVal")
			(param $self (ref $Handler)) (result (ref $Val))
		(ref.as_non_null (struct.get $Handler $val (local.get $self))))

	(type $HandlerEntry
		(struct
			(field $key (ref $Str))
			(field $val (ref $Handler))
			(field $up (ref null $HandlerEntry))))

	(func $newHandlerEntryNull (export "newHandlerEntryNull")
			(result (ref null $HandlerEntry))
		(ref.null $HandlerEntry))

	(func $newHandlerEntry (export "newHandlerEntry")
			(param $key (ref $Str))
			(param $fn (ref $HandlerFn))
			(param $up (ref null $HandlerEntry))
			(result (ref $HandlerEntry))
		(struct.new $HandlerEntry
			(local.get $key)
			(call $newFnHandler (local.get $fn))
			(local.get $up)))

	(func $newHandlerEntryVal (export "newHandlerEntryVal")
			(param $key (ref $Str))
			(param $val (ref $Val))
			(param $up (ref null $HandlerEntry))
			(result (ref $HandlerEntry))
		(struct.new $HandlerEntry
			(local.get $key)
			(call $newValHandler (local.get $val))
			(local.get $up)))

	(func $handlerFind (export "handlerFind")
			(param $he (ref null $HandlerEntry))
			(param $key (ref $Str))
			(result (ref null $Handler))

		(ref.is_null (local.get $he))
		if (result (ref null $Handler))
			(ref.null $Handler)
		else
			(call $rawStrEquals
				(local.get $key)
				(struct.get $HandlerEntry $key (local.get $he)))
			if (result (ref null $Handler))
				(struct.get $HandlerEntry $val (local.get $he))
			else
				(call $handlerFind
					(struct.get $HandlerEntry $up (local.get $he))
					(local.get $key))
			end
		end)

	(func $callHandlerFn (export "callHandlerFn")
			(param $h (ref null $HandlerFn))
			(param $s eqref)
			(param $v eqref)
			(param $o eqref)
			(param $e eqref)
			(result (ref $Val))

		(ref.cast (ref $Val) (local.get $s))
		(ref.cast (ref $Str) (local.get $v))
		(ref.cast (ref $Val) (local.get $o))
		(ref.cast (ref $Frame) (local.get $e))
		(local.get $h)
		(call_ref $HandlerFn)
		(ref.cast (ref $Val)))

	(func $callHandler
			(param $h (ref $Handler))
			(param $s (ref $Val))
			(param $v (ref $Str))
			(param $o (ref $Val))
			(param $e (ref $Frame))
			(result (ref $Val))

		(local $fn (ref null $HandlerFn))
		(local.set $fn (struct.get $Handler $fn (local.get $h)))

		(ref.is_null (local.get $fn))
		if (result (ref $Val))
			(ref.as_non_null
				(call $frameEval
					(local.get $e)
					(ref.as_non_null
						(struct.get $Handler $val (local.get $h)))))
		else
			(local.get $s)
			(local.get $v)
			(local.get $o)
			(local.get $e)
			(call $handlerGetFn (local.get $h))
			(call_ref $HandlerFn)
			(ref.cast (ref $Val))
		end)

	;; handlers

	(type $NativeHandlers (array (mut (ref null $HandlerEntry))))
	(type $Handlers (struct (field $entries (ref $NativeHandlers))))

	(func $newNativeHandlers (result (ref $NativeHandlers))
		(array.new $NativeHandlers (call $newHandlerEntryNull) (i32.const 12)))

	(func $newHandlers (export "newHandlers") (result (ref $Handlers))
		(struct.new $Handlers (call $newNativeHandlers)))

	(func $handlersGetForType (export "handlersGetForType")
			(param $self (ref $Handlers)) (param $t i32)
			(result (ref null $HandlerEntry))
		(array.get $NativeHandlers
			(struct.get $Handlers $entries (local.get $self))
			(local.get $t)))

	(func $handlersBind (export "handlersBind")
			(param $self (ref $Handlers))
			(param $t i32)
			(param $k (ref $Str))
			(param $h (ref $HandlerFn))
		(array.set $NativeHandlers
			(struct.get $Handlers $entries (local.get $self))
			(local.get $t)
			(call $newHandlerEntry
				(local.get $k)
				(local.get $h)
				(call $handlersGetForType
					(local.get $self)
					(local.get $t)))))

	(func $handlersBindVal (export "handlersBindVal")
			(param $self (ref $Handlers))
			(param $t i32)
			(param $k (ref $Str))
			(param $h (ref $Val))
		(array.set $NativeHandlers
			(struct.get $Handlers $entries (local.get $self))
			(local.get $t)
			(call $newHandlerEntryVal
				(local.get $k)
				(local.get $h)
				(call $handlersGetForType
					(local.get $self)
					(local.get $t)))))

	(func $handlersFind (export "handlersFind")
			(param $self (ref $Handlers)) (param $t i32) (param $k (ref $Str))
			(result (ref null $Handler))
		(call $handlerFind
			(call $handlersGetForType
				(local.get $self)
				(local.get $t))
			(local.get $k)))

	;; frame

	(type $Frame
		(struct
			(field $left (ref null $Frame))
			(field $up (ref null $Frame))
			(field $leftLimit (mut i32))
			(field $upLimit (mut i32))
			(field $binds (mut (ref null $BindEntry)))
			(field $handlers (mut (ref $Handlers)))))

	(global $TYPE_FRAME (export "TYPE_FRAME") i32 (i32.const 11))

	(func $newFrameVal (export "newFrameVal")
			(param $v (ref $Frame)) (result (ref $Val))
		(struct.new $Val (global.get $TYPE_FRAME) (local.get $v)))

	(func $valGetFrame (export "valGetFrame")
			(param $v (ref $Val)) (result (ref $Frame))
		(ref.cast (ref $Frame) (struct.get $Val $v (local.get $v))))

	(func $isFrame (export "isFrame") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_FRAME)))

	(func $newFrameNull (export "newFrameNull") (result (ref null $Frame))
		(ref.null $Frame))

	(func $newFrame (export "newFrame") (result (ref $Frame))
		(struct.new $Frame
			(call $newFrameNull)
			(call $newFrameNull)
			(i32.const 0)
			(i32.const 0)
			(call $newBindNull)
			(call $newHandlers)))

	(func $frameDown (export "frameDown")
			(param $f (ref $Frame)) (result (ref $Frame))
		(struct.new $Frame
			(struct.get $Frame $left (local.get $f))
			(local.get $f)
			(i32.const 0)
			(i32.const 0)
			(call $newBindNull)
			(struct.get $Frame $handlers (local.get $f))))

	(func $frameUp (export "frameUp")
			(param $f (ref null $Frame)) (result (ref null $Frame))
		(struct.get $Frame $up (local.get $f)))

	(func $frameBind (export "frameBind")
			(param $f (ref $Frame)) (param $k (ref $Str)) (param $v (ref $Val))
		(struct.set $Frame $binds
			(local.get $f)
			(call $newBindEntry
				(local.get $k)
				(local.get $v)
				(struct.get $Frame $binds (local.get $f)))))

	(func $frameFind (export "frameFind")
			(param $f (ref null $Frame)) (param $key (ref $Str))
			(result (ref null $Val))

		(local $r (ref null $Val))

		(ref.is_null (local.get $f))
		if (result (ref null $Val)) 
			(ref.null $Val)
		else
			(local.set $r
				(call $bindFind
					(struct.get $Frame $binds (local.get $f))
					(local.get $key)))

			(ref.is_null (local.get $r))
			if (result (ref null $Val))
				(call $frameFind (call $frameUp (local.get $f)) (local.get $key))
			else
				(local.get $r)
			end
		end)

	(func $frameBindHandler (export "frameBindHandler")
			(param $f (ref $Frame))
			(param $t i32)
			(param $k (ref $Str))
			(param $h (ref $HandlerFn))
		(call $handlersBind
			(struct.get $Frame $handlers (local.get $f))
			(local.get $t)
			(local.get $k)
			(local.get $h)))

	(func $frameBindHandlerVal (export "frameBindHandlerVal")
			(param $f (ref $Frame))
			(param $t i32)
			(param $k (ref $Str))
			(param $h (ref $Val))
		(call $handlersBindVal
			(struct.get $Frame $handlers (local.get $f))
			(local.get $t)
			(local.get $k)
			(local.get $h)))

	(func $frameFindHandler (export "frameFindHandler")
			(param $f (ref $Frame))
			(param $t i32)
			(param $k (ref $Str))
			(result (ref null $Handler))
		(call $handlersFind
			(struct.get $Frame $handlers (local.get $f))
			(local.get $t)
			(local.get $k)))

	(func $frameSend (export "frameSend")
			(param $f (ref $Frame))
			(param $s (ref $Val))
			(param $v (ref $Str))
			(param $o (ref $Val))
			(param $e (ref $Frame))
			(result (ref null $Val))
		(local $h (ref null $Handler))
		(local.set $h
			(call $frameFindHandler
				(local.get $f)
				(call $valGetTag (local.get $s))
				(local.get $v)))

		(ref.is_null (local.get $h))
		if (result (ref null $Val))
			(ref.null $Val)
		else
			(call $callHandler
				(ref.as_non_null (local.get $h))
				(local.get $s)
				(local.get $v)
				(local.get $o)
				(local.get $e))
		end)


	(data (i32.const 0) "evalitmsgthat<=+-*/.absizenameobjverbsubjupevalIngetTypebindHandler")
	(global $RAW_STR_EVAL (export "RAW_STR_EVAL") (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_E (mut (ref null $Str)) (ref.null $Str))

	(global $RAW_STR_IT (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_MSG (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_THAT (mut (ref null $Str)) (ref.null $Str))

	(global $RAW_STR_EQ (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_LT (mut (ref null $Str)) (ref.null $Str))

	(global $RAW_STR_ADD (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_SUB (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_MUL (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_DIV (mut (ref null $Str)) (ref.null $Str))

	(global $RAW_STR_DOT (mut (ref null $Str)) (ref.null $Str))

	(global $RAW_STR_A (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_B (mut (ref null $Str)) (ref.null $Str))

	(global $RAW_STR_SIZE (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_NAME (mut (ref null $Str)) (ref.null $Str))

	(global $RAW_STR_OBJ (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_VERB (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_SUBJ (mut (ref null $Str)) (ref.null $Str))

	(global $RAW_STR_UP (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_EVAL_IN (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_GET_TYPE (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_BIND (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_BIND_HANDLER (mut (ref null $Str)) (ref.null $Str))

	(func $init
	    (global.set $RAW_STR_E
			(call $rawStrFromMem (i32.const 0) (i32.const 1)))
	    (global.set $RAW_STR_EVAL
			(call $rawStrFromMem (i32.const 0) (i32.const 4)))

	    (global.set $RAW_STR_IT
			(call $rawStrFromMem (i32.const 4) (i32.const 2)))
	    (global.set $RAW_STR_MSG
			(call $rawStrFromMem (i32.const 6) (i32.const 3)))
	    (global.set $RAW_STR_THAT
			(call $rawStrFromMem (i32.const 9) (i32.const 4)))

	    (global.set $RAW_STR_LT
			(call $rawStrFromMem (i32.const 13) (i32.const 1)))
	    (global.set $RAW_STR_EQ
			(call $rawStrFromMem (i32.const 14) (i32.const 1)))

	    (global.set $RAW_STR_ADD
			(call $rawStrFromMem (i32.const 15) (i32.const 1)))
	    (global.set $RAW_STR_SUB
			(call $rawStrFromMem (i32.const 16) (i32.const 1)))
	    (global.set $RAW_STR_MUL
			(call $rawStrFromMem (i32.const 17) (i32.const 1)))
	    (global.set $RAW_STR_DIV
			(call $rawStrFromMem (i32.const 18) (i32.const 1)))

	    (global.set $RAW_STR_DOT
			(call $rawStrFromMem (i32.const 19) (i32.const 1)))

	    (global.set $RAW_STR_A
			(call $rawStrFromMem (i32.const 20) (i32.const 1)))
	    (global.set $RAW_STR_B
			(call $rawStrFromMem (i32.const 21) (i32.const 1)))
	    (global.set $RAW_STR_SIZE
			(call $rawStrFromMem (i32.const 22) (i32.const 4)))
	    (global.set $RAW_STR_NAME
			(call $rawStrFromMem (i32.const 26) (i32.const 4)))

	    (global.set $RAW_STR_OBJ
			(call $rawStrFromMem (i32.const 30) (i32.const 3)))
	    (global.set $RAW_STR_VERB
			(call $rawStrFromMem (i32.const 33) (i32.const 4)))
	    (global.set $RAW_STR_SUBJ
			(call $rawStrFromMem (i32.const 37) (i32.const 4)))

	    (global.set $RAW_STR_UP
			(call $rawStrFromMem (i32.const 41) (i32.const 2)))
	    (global.set $RAW_STR_EVAL_IN
			(call $rawStrFromMem (i32.const 43) (i32.const 6)))
	    (global.set $RAW_STR_GET_TYPE
			(call $rawStrFromMem (i32.const 49) (i32.const 7)))
	    (global.set $RAW_STR_BIND
			(call $rawStrFromMem (i32.const 56) (i32.const 4)))
	    (global.set $RAW_STR_BIND_HANDLER
			(call $rawStrFromMem (i32.const 56) (i32.const 11)))
	)

	(start $init)

	(func $frameEval (export "frameEval")
			(param $f (ref $Frame)) (param $v (ref $Val)) (result (ref null $Val))
		(local $e (ref $Val))
		(local.set $e (call $newFrameVal (local.get $f)))
		(call $frameSend
			(local.get $f)
			(local.get $v)
			(ref.as_non_null (global.get $RAW_STR_EVAL))
			(local.get $e)
			(local.get $f)))

	;; generic handlers

	(func $anyEval (param $f eqref) (param $v eqref) (result (ref $Val))
		(ref.as_non_null
			(call $frameEval
				(ref.cast (ref $Frame) (local.get $f))
				(ref.cast (ref $Val) (local.get $v)))))

	(func $hReturnSubj (export "hReturnSubj")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local.get $s))

	(func $returnNil (export "hReturnNil")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(global.get $NIL))

	;; nil handlers

	(func $hNilEq (export "hNilEq")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $isNil (ref.cast (ref $Val) (local.get $o)))
		if (result (ref $Val))
			(global.get $TRUE)
		else
			(global.get $NIL)
		end)

	;; int handlers

	(func $anyGetI64 (param $v eqref) (result i64)
		(call $valGetI64 (ref.cast (ref $Val) (local.get $v))))

	(func $hIntAdd (export "hIntAdd")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt (i64.add
			(call $anyGetI64 (local.get $s))
			(call $anyGetI64 (local.get $o)))))

	(func $hIntSub (export "hIntSub")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt (i64.sub
			(call $anyGetI64 (local.get $s))
			(call $anyGetI64 (local.get $o)))))

	(func $hIntMul (export "hIntMul")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt (i64.mul
			(call $anyGetI64 (local.get $s))
			(call $anyGetI64 (local.get $o)))))

	(func $hIntDiv (export "hIntDiv")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.div
			(f64.convert_i64_s (call $anyGetI64 (local.get $s)))
			(f64.convert_i64_s (call $anyGetI64 (local.get $o))))))

	(func $hIntEq (export "hIntEq")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(i64.eq
			(call $anyGetI64 (local.get $s))
			(call $anyGetI64 (local.get $o)))
		if (result (ref $Val))
			(ref.cast (ref $Val) (local.get $s))
		else
			(global.get $NIL)
		end)

	(func $hIntLt (export "hIntLt")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(i64.lt_s
			(call $anyGetI64 (local.get $s))
			(call $anyGetI64 (local.get $o)))
		if (result (ref $Val))
			(ref.cast (ref $Val) (local.get $s))
		else
			(global.get $NIL)
		end)

	;; float handlers

	(func $anyGetF64 (param $v eqref) (result f64)
		(call $valGetF64 (ref.cast (ref $Val) (local.get $v))))

	(func $hFloatAdd (export "hFloatAdd")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.add
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))))

	(func $hFloatSub (export "hFloatSub")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.sub
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))))

	(func $hFloatMul (export "hFloatMul")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.mul
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))))

	(func $hFloatDiv (export "hFloatDiv")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.div
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))))

	(func $hFloatEq (export "hFloatEq")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(f64.eq
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))
		if (result (ref $Val))
			(ref.cast (ref $Val) (local.get $s))
		else
			(global.get $NIL)
		end)

	(func $hFloatLt (export "hFloatLt")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(f64.lt
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))
		if (result (ref $Val))
			(ref.cast (ref $Val) (local.get $s))
		else
			(global.get $NIL)
		end)

	;; str handlers

	(func $anyGetStr (param $v eqref) (result (ref $Str))
		(call $valGetStr (ref.cast (ref $Val) (local.get $v))))

	(func $hStrSize (export "hStrSize")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt
			(i64.extend_i32_s (call $strLen (ref.cast (ref $Val) (local.get $s))))))

	(func $hStrEq (export "hStrEq")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $rawStrEquals
			(call $anyGetStr (local.get $s))
			(call $anyGetStr (local.get $o)))
		if (result (ref $Val))
			(ref.cast (ref $Val) (local.get $s))
		else
			(global.get $NIL)
		end)

	(func $hStrLt (export "hStrLt")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $rawStrLt
			(call $anyGetStr (local.get $s))
			(call $anyGetStr (local.get $o)))
		if (result (ref $Val))
			(ref.cast (ref $Val) (local.get $s))
		else
			(global.get $NIL)
		end)

	;; pair handlers

	(func $hPairA (export "hPairA")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $pairGetA (ref.cast (ref $Val) (local.get $s))))

	(func $hPairB (export "hPairB")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $pairGetB (ref.cast (ref $Val) (local.get $s))))

	(func $hPairEval (export "hPairEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local $pair (ref $Val))
		(local.set $pair (ref.cast (ref $Val) (local.get $s)))

		(call $newPair
			(call $anyEval (local.get $e) (call $pairGetA (local.get $pair)))
			(call $anyEval (local.get $e) (call $pairGetB (local.get $pair)))))

	;; later handlers

	(func $hLaterEval (export "hLaterEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $laterUnwrap (ref.cast (ref $Val) (local.get $s))))

	;; name handlers

	(func $hNameEval (export "hNameEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local $str (ref $Str))
		(local.set $str
			(call $valGetNameRawStr (ref.cast (ref $Val) (local.get $s))))

		(call $rawStrEquals
			(local.get $str)
			(ref.as_non_null (global.get $RAW_STR_E)))
		if (result (ref $Val))
			(call $newFrameVal (ref.cast (ref $Frame) (local.get $e)))
		else
			(ref.as_non_null
				(call $frameFind
					(ref.cast (ref $Frame) (local.get $e))
					(local.get $str)))
		end)

	(func $hNameStr (export "hNameStr")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $strFromRawStr
			(call $valGetNameRawStr (ref.cast (ref $Val) (local.get $s)))))

	;; msg handlers

	(func $hMsgVerb (export "hMsgVerb")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $valGetMsgVerb (ref.cast (ref $Val) (local.get $s))))

	(func $hMsgObj (export "hMsgObj")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $valGetMsgObj (ref.cast (ref $Val) (local.get $s))))

	(func $hMsgEval (export "hMsgEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newMsg
			(call $valGetMsgVerbRawStr (ref.cast (ref $Val) (local.get $s)))
			(call $anyEval
				(local.get $e)
				(call $valGetMsgObj (ref.cast (ref $Val) (local.get $s))))))

	;; send handlers

	(func $hSendSubj (export "hSendSubj")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $valGetSendSubj (ref.cast (ref $Val) (local.get $s))))

	(func $hSendMsg (export "hSendMsg")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $valGetSendMsg (ref.cast (ref $Val) (local.get $s))))

	(func $hSendEval (export "hSendEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local $self (ref $Val))
		(local $frame (ref $Frame))
		(local $subj (ref $Val))
		(local $msg (ref $Val))
		(local $that (ref $Val))
		(local $frameForSend (ref $Frame))

		(local.set $self (ref.cast (ref $Val) (local.get $s)))
		(local.set $frame (ref.cast (ref $Frame) (local.get $e)))
		(local.set $subj
			(ref.as_non_null
				(call $frameEval
					(local.get $frame)
					(call $valGetSendSubj (local.get $self)))))
		(local.set $msg
			(ref.as_non_null
				(call $frameEval
					(local.get $frame)
					(call $valGetSendMsg (local.get $self)))))
		(local.set $that (call $valGetMsgObj (local.get $msg)))
		(local.set $frameForSend (call $frameDown (local.get $frame)))

		(call $frameBind
			(local.get $frameForSend)
			(ref.as_non_null (global.get $RAW_STR_IT))
			(local.get $subj))
		(call $frameBind
			(local.get $frameForSend)
			(ref.as_non_null (global.get $RAW_STR_MSG))
			(local.get $msg))
		(call $frameBind
			(local.get $frameForSend)
			(ref.as_non_null (global.get $RAW_STR_THAT))
			(local.get $that))

		(ref.as_non_null
			(call $frameSend
				(local.get $frameForSend)
				(local.get $subj)
				(call $valGetMsgVerbRawStr (local.get $msg))
				(local.get $that)
				(local.get $frameForSend))))

	;; block handlers
	
	(func $hBlockEval (export "hBlockEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)

	    (local $i i32)
	    (local $end i32)
		(local $items (ref $Block))
		(local $result (ref $Val))
		(local $item (ref $Val))
		(local $frame (ref $Frame))

		(local.set $items
			(call $valGetBlockRaw (ref.cast (ref $Val) (local.get $s))))
	    (local.set $i (i32.const 0))
		(local.set $end (array.len (local.get $items)))
		(local.set $result (global.get $NIL))
		(local.set $frame (ref.cast (ref $Frame) (local.get $e)))

	    ;; while ($i < $end)
	    block $loop_exit
			loop $loop
				;; Break the loop if $i >= $end
				(i32.ge_s (local.get $i) (local.get $end))
				br_if $loop_exit

				(local.set $item
					(array.get $Block (local.get $items) (local.get $i)))
				(local.set $result
					(ref.as_non_null
						(call $frameEval (local.get $frame) (local.get $item))))

				;; $i++
				(local.set $i (i32.add (local.get $i) (i32.const 1)))

				br $loop
			end
		end

		(local.get $result)
	)

	;; array handlers
	
	(func $hArraySize (export "hArraySize")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt
			(i64.extend_i32_s
				(array.len
					(call $valGetArrayRaw (ref.cast (ref $Val) (local.get $s)))))))

	(func $hArrayGetItem (export "hArrayGetItem")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $arrayGetItem
			(ref.cast (ref $Val) (local.get $s))
			(i32.wrap_i64 (call $anyGetI64 (local.get $o)))))

	(func $hArrayEval (export "hArrayEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)

	    (local $i i32)
	    (local $end i32)
		(local $items (ref $Block))
		(local $result (ref $Array))
		(local $item (ref $Val))
		(local $frame (ref $Frame))

		(local.set $items
			(call $valGetArrayRaw (ref.cast (ref $Val) (local.get $s))))
	    (local.set $i (i32.const 0))
		(local.set $end (array.len (local.get $items)))
		(local.set $result (array.new $Array (global.get $NIL) (local.get $end)))
		(local.set $frame (ref.cast (ref $Frame) (local.get $e)))

	    ;; while ($i < $end)
	    block $loop_exit
			loop $loop
				;; Break the loop if $i >= $end
				(i32.ge_s (local.get $i) (local.get $end))
				br_if $loop_exit

				(local.set $item
					(array.get $Block (local.get $items) (local.get $i)))
				(array.set $Array
					(local.get $result)
					(local.get $i)
					(ref.as_non_null
						(call $frameEval (local.get $frame) (local.get $item))))

				(local.set $i (i32.add (local.get $i) (i32.const 1)))

				br $loop
			end
		end

		(struct.new $Val (global.get $TYPE_ARRAY) (local.get $result)))

	;; frame handlers

	(func $anyGetFrame (param $v eqref) (result (ref $Frame))
		(call $valGetFrame (ref.cast (ref $Val) (local.get $v))))

	(func $hFrameUp (export "hFrameUp")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFrameVal
			(ref.as_non_null (call $frameUp (call $anyGetFrame (local.get $s))))))

	(func $hFrameEvalIn (export "hFrameEvalIn")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $anyEval
			(call $anyGetFrame (local.get $s))
			(ref.cast (ref $Val) (local.get $o))))

	(func $hGetObjType (export "hGetObjType")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt
			(i64.extend_i32_s
				(call $valGetTag (ref.cast (ref $Val) (local.get $o))))))

	(func $hFrameBind (export "hFrameBind")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local $pair (ref $Val))
		(local.set $pair (ref.cast (ref $Val) (local.get $o)))

		(call $frameBind
			(call $anyGetFrame (local.get $s))
			(call $valGetStr (call $pairGetA (local.get $pair)))
			(call $pairGetB (local.get $pair)))

		(local.get $s))

	(func $hFrameBindHandler (export "hFrameBindHandler")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local $items (ref $Array))
		(local $type (ref $Val))
		(local $verb (ref $Val))
		(local $impl (ref $Val))

		(local.set $items
			(call $valGetArrayRaw (ref.cast (ref $Val) (local.get $o))))
		(local.set $type (array.get $Array (local.get $items) (i32.const 0)))
		(local.set $verb (array.get $Array (local.get $items) (i32.const 1)))
		(local.set $impl (array.get $Array (local.get $items) (i32.const 2)))

		(call $frameBindHandlerVal
			(call $anyGetFrame (local.get $s))
			(call $valGetI32 (local.get $type))
			(call $valGetStr (local.get $verb))
			(local.get $impl))

		(local.get $s))

	;; util

	(func $newPrimFrame (export "newPrimFrame")
			(result (ref $Frame))
		(local $f (ref $Frame))
		(local $sEval (ref $Str))
		(local $sEq  (ref $Str))
		(local $sLt  (ref $Str))
		(local $sAdd (ref $Str))
		(local $sSub (ref $Str))
		(local $sMul (ref $Str))
		(local $sDiv (ref $Str))
		(local $sDot (ref $Str))
		(local $sSize (ref $Str))

		(local.set $f (call $newFrame))
		(local.set $sEval (ref.as_non_null (global.get $RAW_STR_EVAL)))
		(local.set $sEq (ref.as_non_null (global.get $RAW_STR_EQ)))
		(local.set $sLt (ref.as_non_null (global.get $RAW_STR_LT)))

		(local.set $sAdd (ref.as_non_null (global.get $RAW_STR_ADD)))
		(local.set $sSub (ref.as_non_null (global.get $RAW_STR_SUB)))
		(local.set $sMul (ref.as_non_null (global.get $RAW_STR_MUL)))
		(local.set $sDiv (ref.as_non_null (global.get $RAW_STR_DIV)))

		(local.set $sDot (ref.as_non_null (global.get $RAW_STR_DOT)))
		(local.set $sSize (ref.as_non_null (global.get $RAW_STR_SIZE)))

		;; eval

		(call $frameBindHandler (local.get $f) (global.get $TYPE_NIL)
			 (local.get $sEval) (ref.func $hReturnSubj))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_INT)
			 (local.get $sEval) (ref.func $hReturnSubj))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FLOAT)
			 (local.get $sEval) (ref.func $hReturnSubj))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_STR)
			 (local.get $sEval) (ref.func $hReturnSubj))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FRAME)
			 (local.get $sEval) (ref.func $hReturnSubj))

		(call $frameBindHandler (local.get $f) (global.get $TYPE_NAME)
			 (local.get $sEval) (ref.func $hNameEval))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_LATER)
			 (local.get $sEval) (ref.func $hLaterEval))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_PAIR)
			 (local.get $sEval) (ref.func $hPairEval))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_MSG)
			 (local.get $sEval) (ref.func $hMsgEval))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_SEND)
			 (local.get $sEval) (ref.func $hSendEval))

		(call $frameBindHandler (local.get $f) (global.get $TYPE_BLOCK)
			 (local.get $sEval) (ref.func $hBlockEval))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_ARRAY)
			 (local.get $sEval) (ref.func $hArrayEval))

		;; =

		(call $frameBindHandler (local.get $f) (global.get $TYPE_NIL)
			 (local.get $sEq) (ref.func $hNilEq))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_INT)
			 (local.get $sEq) (ref.func $hIntEq))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FLOAT)
			 (local.get $sEq) (ref.func $hFloatEq))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_STR)
			 (local.get $sEq) (ref.func $hStrEq))

		;; <

		(call $frameBindHandler (local.get $f) (global.get $TYPE_NIL)
			 (local.get $sLt) (ref.func $returnNil))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_INT)
			 (local.get $sLt) (ref.func $hIntLt))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FLOAT)
			 (local.get $sLt) (ref.func $hFloatLt))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_STR)
			 (local.get $sLt) (ref.func $hStrLt))

		;; +

		(call $frameBindHandler (local.get $f) (global.get $TYPE_INT)
			 (local.get $sAdd) (ref.func $hIntAdd))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FLOAT)
			 (local.get $sAdd) (ref.func $hFloatAdd))

		;; -

		(call $frameBindHandler (local.get $f) (global.get $TYPE_INT)
			 (local.get $sSub) (ref.func $hIntSub))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FLOAT)
			 (local.get $sSub) (ref.func $hFloatSub))

		;; *

		(call $frameBindHandler (local.get $f) (global.get $TYPE_INT)
			 (local.get $sMul) (ref.func $hIntMul))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FLOAT)
			 (local.get $sMul) (ref.func $hFloatMul))

		;; /

		(call $frameBindHandler (local.get $f) (global.get $TYPE_INT)
			 (local.get $sDiv) (ref.func $hIntDiv))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FLOAT)
			 (local.get $sDiv) (ref.func $hFloatDiv))

		;; .

		(call $frameBindHandler (local.get $f) (global.get $TYPE_ARRAY)
			 (local.get $sDot) (ref.func $hArrayGetItem))

		;; size

		(call $frameBindHandler (local.get $f) (global.get $TYPE_STR)
			 (local.get $sSize) (ref.func $hStrSize))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_ARRAY)
			 (local.get $sSize) (ref.func $hArraySize))

		;; pair methods

		(call $frameBindHandler (local.get $f) (global.get $TYPE_PAIR)
			 (ref.as_non_null (global.get $RAW_STR_A)) (ref.func $hPairA))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_PAIR)
			 (ref.as_non_null (global.get $RAW_STR_B)) (ref.func $hPairB))

		;; name methods

		(call $frameBindHandler (local.get $f) (global.get $TYPE_NAME)
			 (ref.as_non_null (global.get $RAW_STR_NAME)) (ref.func $hNameStr))

		;; msg methods

		(call $frameBindHandler (local.get $f) (global.get $TYPE_MSG)
			 (ref.as_non_null (global.get $RAW_STR_VERB)) (ref.func $hMsgVerb))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_MSG)
			 (ref.as_non_null (global.get $RAW_STR_OBJ)) (ref.func $hMsgObj))

		;; send methods

		(call $frameBindHandler (local.get $f) (global.get $TYPE_SEND)
			 (ref.as_non_null (global.get $RAW_STR_SUBJ)) (ref.func $hSendSubj))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_SEND)
			 (ref.as_non_null (global.get $RAW_STR_MSG)) (ref.func $hSendMsg))

		;; frame methods

		(call $frameBindHandler (local.get $f) (global.get $TYPE_FRAME)
			 (ref.as_non_null (global.get $RAW_STR_UP)) (ref.func $hFrameUp))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FRAME)
			 (ref.as_non_null (global.get $RAW_STR_EVAL_IN)) (ref.func $hFrameEvalIn))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FRAME)
			 (ref.as_non_null (global.get $RAW_STR_BIND)) (ref.func $hFrameBind))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FRAME)
			 (ref.as_non_null (global.get $RAW_STR_BIND_HANDLER)) (ref.func $hFrameBindHandler))
		(call $frameBindHandler (local.get $f) (global.get $TYPE_FRAME)
			 (ref.as_non_null (global.get $RAW_STR_GET_TYPE)) (ref.func $hGetObjType))

		(local.get $f))

		;; vm

		(func $sEmpty (export "sEmpty") (result (ref null $Pair))
			(ref.null $Pair))

		(func $sIsEmpty (export "sIsEmpty") (param $s (ref null $Pair)) (result i32)
			(ref.is_null (local.get $s)))

		(func $sPushVal
				(param $s (ref null $Pair)) (param $v (ref $Val)) (result (ref $Pair))
			(ref.is_null (local.get $s))
			if (result (ref $Pair))

				(struct.new $Pair (local.get $v) (global.get $NIL))
			else
				(struct.new $Pair
					(local.get $v)
					(call $newPairFromRaw (ref.as_non_null (local.get $s))))
			end)

		(func $sPeek (export "sPeek")
				(param $s (ref null $Pair)) (result (ref null $Val))
			(ref.is_null (local.get $s))
			if (result (ref null $Val))
				(ref.null $Val)
			else
				(struct.get $Pair $a (ref.as_non_null (local.get $s)))
			end)

		(func $sPeekFail (export "sPeekFail")
				(param $s (ref null $Pair)) (result (ref $Val))
			(ref.as_non_null (call $sPeek (local.get $s))))

		(func $sPop (export "sPop")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(local $b (ref $Val))
			(local.set $b (struct.get $Pair $b (ref.as_non_null (local.get $s))))

			(call $isNil (local.get $b))
			if (result (ref null $Pair))
				(call $sEmpty)
			else
				(ref.cast (ref $Pair) (struct.get $Val $v (local.get $b)))
			end)

		(func $sPushNil (export "sPushNil")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushVal (local.get $s) (global.get $NIL)))

		(func $sPushI64 (export "sPushI64")
				(param $s (ref null $Pair)) (param $v i64) (result (ref null $Pair))
			(call $sPushVal (local.get $s) (call $newInt (local.get $v))))

		(func $sPushF64 (export "sPushF64")
				(param $s (ref null $Pair)) (param $v f64) (result (ref null $Pair))
			(call $sPushVal (local.get $s) (call $newFloat (local.get $v))))

		(func $sNewName (export "sNewName")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(local $v (ref $Str))
			(local $s1 (ref null $Pair))

			(local.set $v (call $valGetStr (call $sPeekFail (local.get $s))))
			(local.set $s1 (call $sPop (local.get $s)))

			(call $sPushVal
				(local.get $s1)
				(call $newName (local.get $v))))

		(func $sNewLater (export "sNewLater")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(local $v (ref $Val))
			(local $s1 (ref null $Pair))

			(local.set $v (call $sPeekFail (local.get $s)))
			(local.set $s1 (call $sPop (local.get $s)))

			(call $sPushVal
				(local.get $s1)
				(call $newLater (local.get $v))))

		(func $sNewPair (export "sNewPair")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(local $a (ref $Val))
			(local $b (ref $Val))
			(local $s1 (ref null $Pair))
			(local $s2 (ref null $Pair))

			(local.set $a (call $sPeekFail (local.get $s)))
			(local.set $s1 (call $sPop (local.get $s)))
			(local.set $b (call $sPeekFail (local.get $s1)))
			(local.set $s2 (call $sPop (local.get $s1)))

			(call $sPushVal
				(local.get $s2)
				(call $newPair (local.get $a) (local.get $b))))

		(func $sNewMsg (export "sNewMsg")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(local $verb (ref $Str))
			(local $obj (ref $Val))

			(local $s1 (ref null $Pair))
			(local $s2 (ref null $Pair))

			(local.set $verb (call $valGetStr (call $sPeekFail (local.get $s))))
			(local.set $s1 (call $sPop (local.get $s)))

			(local.set $obj (call $sPeekFail (local.get $s1)))
			(local.set $s2 (call $sPop (local.get $s1)))

			(call $sPushVal
				(local.get $s2)
				(call $newMsg
					(local.get $verb)
					(local.get $obj))))

		(func $sNewSend (export "sNewSend")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(local $subj (ref $Val))
			(local $verb (ref $Str))
			(local $obj (ref $Val))

			(local $s1 (ref null $Pair))
			(local $s2 (ref null $Pair))
			(local $s3 (ref null $Pair))

			(local.set $subj (call $sPeekFail (local.get $s)))
			(local.set $s1 (call $sPop (local.get $s)))

			(local.set $verb (call $valGetStr (call $sPeekFail (local.get $s1))))
			(local.set $s2 (call $sPop (local.get $s1)))

			(local.set $obj (call $sPeekFail (local.get $s2)))
			(local.set $s3 (call $sPop (local.get $s2)))

			(call $sPushVal
				(local.get $s3)
				(call $newSend
					(local.get $subj)
					(call $newRawMsg
						(local.get $verb) (local.get $obj)))))

		(func $sNewArray (export "sNewArray")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(local $arr (ref $Val))
			(local $len (ref $Val))
			(local $sr (ref null $Pair))
			(local $i i32)
			(local $end i32)

			(local.set $len (call $sPeekFail (local.get $s)))
			(local.set $sr (call $sPop (local.get $s)))

			(local.set $i (i32.const 0))
			(local.set $end (call $valGetI32 (local.get $len)))
			(local.set $arr (call $newArray (local.get $end)))

			block $loop_exit
			  loop $loop
			    (i32.ge_s (local.get $i) (local.get $end))
			    br_if $loop_exit

				(call $arraySetItem
					(local.get $arr)
					(local.get $i)
					(call $sPeekFail (local.get $sr)))
				(local.set $sr (call $sPop (local.get $sr)))

			    (local.set $i (i32.add (local.get $i) (i32.const 1)))

			    br $loop
			  end
			end

			(call $sPushVal
				(local.get $sr)
				(local.get $arr)))

		(func $sEvalTop (export "sEvalTop")
				(param $s (ref null $Pair)) (param $f (ref $Frame))
				(result (ref null $Pair))
			(local $v (ref $Val))
			(local $s1 (ref null $Pair))

			(local.set $v (call $sPeekFail (local.get $s)))
			(local.set $s1 (call $sPop (local.get $s)))

			(call $sPushVal
				(local.get $s1)
				(ref.as_non_null
					(call $frameEval (local.get $f) (local.get $v)))))

		(func $sPushStrRawN
				(param $s (ref null $Pair)) (param $v (ref null $Str))
				(result (ref null $Pair))
			(call $sPushVal
				(local.get $s)
				(call $strFromRawStr (ref.as_non_null (local.get $v)))))
 
		(func $sPushSymAdd (export "sPushSymAdd")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_ADD)))
		(func $sPushSymSub (export "sPushSymSub")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_SUB)))
		(func $sPushSymMul (export "sPushSymMul")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_MUL)))
		(func $sPushSymDiv (export "sPushSymDiv")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_DIV)))

		(func $sPushSymEq (export "sPushSymEq")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_EQ)))
		(func $sPushSymLt (export "sPushSymLt")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_LT)))

		(func $sPushSymDot (export "sPushSymDot")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_DOT)))
		(func $sPushSymA (export "sPushSymA")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_A)))
		(func $sPushSymB (export "sPushSymB")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_B)))

		(func $sPushSymE (export "sPushSymE")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_E)))
		(func $sPushSymEval (export "sPushSymEval")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_EVAL)))

		(func $sPushSymIt (export "sPushSymIt")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_IT)))
		(func $sPushSymMsg (export "sPushSymMsg")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_MSG)))
		(func $sPushSymThat (export "sPushSymThat")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_THAT)))
		(func $sPushSymSubj (export "sPushSymSubj")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_SUBJ)))
		(func $sPushSymVerb (export "sPushSymVerb")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_VERB)))
		(func $sPushSymObj (export "sPushSymObj")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_OBJ)))

		(func $sPushSymSize (export "sPushSymSize")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_SIZE)))
		(func $sPushSymName (export "sPushSymName")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_NAME)))
		(func $sPushSymUp (export "sPushSymUp")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_UP)))
		(func $sPushSymEvalIn (export "sPushSymEvalIn")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_EVAL_IN)))
		(func $sPushSymGetType (export "sPushSymGetType")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_GET_TYPE)))
		(func $sPushSymBind (export "sPushSymBind")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_BIND)))
		(func $sPushSymBindHandler (export "sPushSymBindHandler")
				(param $s (ref null $Pair)) (result (ref null $Pair))
			(call $sPushStrRawN (local.get $s) (global.get $RAW_STR_BIND_HANDLER)))
)
